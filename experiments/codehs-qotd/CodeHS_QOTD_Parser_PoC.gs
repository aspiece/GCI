/**
 * Read-only CodeHS QOTD parser experiment.
 * NOT an official CodeHS API. Do not deploy as a public feed or copy
 * content into the classroom dashboard without verifying reuse permission.
 * Run testCodeHSQotdParserPoC from the Apps Script editor.
 * Compares three dates and fingerprints prompt and choices without logging their content.
 * CONTENT_UNVERIFIED is intentional until a teacher compares against CodeHS.
 */
function testCodeHSQotdParserPoC() {
  const dates = ['2026-11-04', '2026-11-05', '2026-11-06'];
  const results = dates.map(inspectCodeHSQotdPage_);
  const complete = results.filter(x => x.status === 200 && x.questionFingerprint);
  const samePrompt = complete.length > 1 && new Set(complete.map(x => x.questionFingerprint)).size === 1;
  const sameChoices = complete.length > 1 && new Set(complete.map(x => x.choiceFingerprints.join('|'))).size === 1;
  results.forEach(result => {
    result.crossDateSamePrompt = samePrompt;
    result.crossDateSameChoices = sameChoices;
    if (result.state === 'STRUCTURE_CANDIDATE') result.state = 'CONTENT_UNVERIFIED';
    console.log(JSON.stringify(result, null, 2));
  });
  if (samePrompt && sameChoices) console.log('WARNING: Same extracted prompt and choices across dates; compare against CodeHS visually.');
}

function inspectCodeHSQotdPage_(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Invalid date');
  const url = 'https://codehs.com/qotd/python/' + date + '/';
  const response = UrlFetchApp.fetch(url, {
    muteHttpExceptions: true,
    followRedirects: true
  });
  const status = response.getResponseCode();
  if (status !== 200) return {date, status, state:'HTTP_ERROR'};
  const html = response.getContentText();
  const match = html.match(/<ol\b[^>]*class=["'][^"']*quiz-questions[^"']*["'][^>]*>([\s\S]*?)<\/ol>/i);
  if (!match) return {date,status,state:'QUESTION_CONTAINER_MISSING'};
  const section = match[1];
  const answerList = section.search(/<ol\b[^>]*class=["'][^"']*quiz-question-answers/i);
  if (answerList < 0) return {date,status,state:'CHOICE_CONTAINER_MISSING'};
  const promptHtml = section.slice(0, answerList);
  const choicesHtml = section.slice(answerList);
  // Structural probe only: do not log or redistribute question text.
  const labels = [...choicesHtml.matchAll(/<label\b[^>]*>([\s\S]*?)<\/label>/gi)];
  const clean = markup => markup
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'')
    .replace(/<[^>]*>/g,' ')
    .replace(/&nbsp;|&#160;/gi,' ')
    .replace(/&amp;/gi,'&')
    .replace(/&lt;/gi,'<')
    .replace(/&gt;/gi,'>')
    .replace(/&quot;/gi,'"')
    .replace(/\s+/g,' ').trim();
  const promptText = clean(promptHtml);
  const choices = labels.map(x => clean(x[1]));
  const uniqueChoices = new Set(choices.map(x => x.trim().toLowerCase())).size;
  const fingerprint = x => Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, x)
    .slice(0, 8).map(b => ('0' + (b & 255).toString(16)).slice(-2)).join('');
  const fingerprints = choices.map(fingerprint);
  const result = {
    date,status,source:url,
    questionTextLength:promptText.length,
    questionFingerprint:fingerprint(promptText),
    promptHasNestedMarkup:/<span\\b/i.test(promptHtml),
    choiceCount:choices.length,
    choiceTextLengths:choices.map(x=>x.length),
    distinctChoiceCount:uniqueChoices,
    choiceFingerprints:fingerprints,
    likelyRepeatedInterfaceText:uniqueChoices<choices.length,
    hasSyntaxHighlighting:/prism-highlight|token/i.test(section),
    state:promptText.length>0 && choices.length===4 && choices.every(x=>x.length>0) && uniqueChoices===4
      ? 'STRUCTURE_CANDIDATE' : 'NEEDS_PARSER_REFINEMENT'
  };
  return result;
}
