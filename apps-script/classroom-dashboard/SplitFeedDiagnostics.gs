/**
 * Read-only pre-release checks for the two-stage dashboard feed.
 * Run in the Apps Script editor after copying the split-feed Code.gs.
 * Do not publish execution logs containing private account information.
 */
function testSplitDashboardFeed() {
  const date='2026-11-09';
  const checks=[
    {mode:'content',callback:'gciDashboardFeed'},
    {mode:'courses',callback:'gciDashboardCoursesFeed'},
    {mode:'full',callback:'gciDashboardFeed'}
  ];
  checks.forEach(test=>{
    const started=Date.now();
    const parameters={date:date,requestId:'42',callback:test.callback};
    if(test.mode!=='full')parameters.mode=test.mode;
    const output=doGet({parameter:parameters}).getContent();
    const prefix=test.callback+'(';
    if(!output.startsWith(prefix)||!output.endsWith(');'))throw new Error(test.mode+': invalid callback wrapper');
    const payload=JSON.parse(output.slice(prefix.length,-2));
    if(payload.error)throw new Error(test.mode+': '+payload.error);
    if(payload.date!==date||payload.requestId!=='42')throw new Error(test.mode+': date/request ID mismatch');
    if(test.mode==='content'){
      if(!payload.qotd||payload.qotd.title!=='Parameters vs. Arguments')throw new Error('Content feed missing November 9 QOTD');
      if(!payload.courses||!payload.courses.every(c=>c.status==='loading'))throw new Error('Content feed unexpectedly fetched coursework');
    }else if(!Array.isArray(payload.courses)||payload.courses.length!==5){
      throw new Error(test.mode+': missing course summaries');
    }
    console.log(test.mode+' OK | '+(Date.now()-started)+'ms | courses: '+payload.courses.map(c=>c.status).join(','));
  });
}
