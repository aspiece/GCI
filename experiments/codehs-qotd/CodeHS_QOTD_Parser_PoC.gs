/**
 * Read-only CodeHS QOTD parser experiment.
 * NOT an official CodeHS API. Do not deploy as a public feed or copy
 * content into the classroom dashboard without verifying reuse permission.
 * Run testCodeHSQotdParserPoC from the Apps Script editor.
 */
function testCodeHSQotdParserPoC() {
  const dates = ['2026-11-06'];
  dates.forEach(date => {
    const result = inspectCodeHSQotdPage_(date);
    console.log(JSON.stringify(result, null, 2));
  });
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
  const result = {
    date,status,source:url,
    questionTextLength:promptText.length,
    choiceCount:choices.length,
    choiceTextLengths:choices.map(x=>x.length),
    hasSyntaxHighlighting:/prism-highlight|token/i.test(section),
    state:promptText.length>0 && choices.length===4 && choices.every(x=>x.length>0)
      ? 'STRUCTURE_CANDIDATE' : 'NEEDS_PARSER_REFINEMENT'
  };
  return result;
}
