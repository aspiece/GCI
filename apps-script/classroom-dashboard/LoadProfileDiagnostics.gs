/** Read-only timing test. Run after copying the profiling Code.gs into Apps Script. */
function profileDashboardInstructionalLoad() {
  const id=PropertiesService.getScriptProperties().getProperty("DASHBOARD_SPREADSHEET_ID");
  if(!id)throw new Error("Missing DASHBOARD_SPREADSHEET_ID");
  const ss=SpreadsheetApp.openById(id);
  const date="2026-11-09";
  for(let attempt=1;attempt<=2;attempt++){
    const started=Date.now();
    const result=dashboardData_(ss,new Date(),date,true);
    if(result.qotd?.title!=="Parameters vs. Arguments")throw new Error("QOTD content mismatch");
    if(result.courses.some(c=>c.status!=="loading"))throw new Error("Content feed unexpectedly retrieved coursework");
    console.log("Instructional load "+attempt+": "+(Date.now()-started)+" ms");
  }
}

/** Validate cached tab data retains date values and matches the raw sheet. */
function verifyDashboardTabCache() {
  const id=PropertiesService.getScriptProperties().getProperty("DASHBOARD_SPREADSHEET_ID");
  const ss=SpreadsheetApp.openById(id);
  ["Calendar","Daily Starter QOTD","Brain Breaks","Focus Plans"].forEach(name=>{
    const raw=dashboardRows_(ss,name);
    const cached=dashboardCachedRows_(ss,name);
    if(raw.length!==cached.length)throw new Error(name+": row count differs");
    const dateField=Object.keys(raw[0]||{}).find(k=>/date/i.test(k));
    if(dateField&&raw.length){
      const a=raw[0][dateField],b=cached[0][dateField];
      const normalize=v=>v instanceof Date?v.getTime():String(v);
      if(normalize(a)!==normalize(b))throw new Error(name+": date changed in cache");
      if((a instanceof Date)!==(b instanceof Date))throw new Error(name+": Date type not preserved");
    }
    console.log(name+": PASS ("+cached.length+" rows)");
  });
}
