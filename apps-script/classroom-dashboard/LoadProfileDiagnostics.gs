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
