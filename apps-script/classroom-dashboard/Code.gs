/** Standalone, read-only feed for Classroom_Dashboard.html.
 * Deploy separately from the existing dashboard. See README.md before enabling.
 * Script properties: DASHBOARD_SPREADSHEET_ID, PUBLIC_FEED_ENABLED.
 */
const DASHBOARD_COURSES = ['1st Session','2nd Session','3rd Session','Career Essentials','Career Exploration'];
const DASHBOARD_PHASES = [
  {name:'Daily Starter',minutes:5,icon:'✦',message:'Think, share, and build on an idea.'},
  {name:'Focus',minutes:40,icon:'◎',message:'Begin your work. Take your next step.'},
  {name:'Brain Break',minutes:10,icon:'☀',message:'Pause your work and reset your attention.'},
  {name:'Focus',minutes:40,icon:'◎',message:'Return to your work with a fresh perspective.'},
  {name:'Cleanup',minutes:10,icon:'✓',message:'Save your work and reset your space.'}
];
const DASHBOARD_SESSIONS = [
  {name:'1st Session',start:'07:00',end:'08:45'},
  {name:'2nd Session',start:'08:50',end:'10:35'},
  {name:'3rd Session',start:'12:05',end:'13:50'}
];

function doGet(e) {
  const params=e&&e.parameter||{};
  const callback=params.callback;
  if(callback&&callback!=='gciDashboardFeed')return ContentService.createTextOutput('Invalid callback.');
  const requestId=/^\d{1,10}$/.test(params.requestId||'')?params.requestId:'';
  let result;
  try {
    const selectedDate=params.date?dashboardValidDate_(params.date):'';
    if(params.date&&!selectedDate)throw new Error('Invalid requested date');
    const properties=PropertiesService.getScriptProperties();
    if(properties.getProperty('PUBLIC_FEED_ENABLED')!=='true')throw new Error('Feed disabled');
    const id=properties.getProperty('DASHBOARD_SPREADSHEET_ID');
    if(!id)throw new Error('Missing spreadsheet configuration');
    const cache=CacheService.getScriptCache(),key='dashboard:v5:'+id+':'+(selectedDate||'today');
    const cached=cache.get(key);
    const today=Utilities.formatDate(new Date(),'America/Detroit','yyyy-MM-dd');
    result=cached?JSON.parse(cached):null;
    if(!result||result.today!==today){
      result=dashboardData_(SpreadsheetApp.openById(id),new Date(),selectedDate);
      const encoded=JSON.stringify(result);
      if(encoded.length<85000)cache.put(key,encoded,60);
    }
  } catch(error) {
    console.error(error);
    // Never expose stack traces, spreadsheet IDs, or authorization details.
    result={error:'Dashboard feed unavailable. Check configuration in Apps Script.'};
  }
  const output=JSON.stringify(Object.assign({},result,{requestId:requestId})).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
  return ContentService.createTextOutput(callback?callback+'('+output+');':output)
    .setMimeType(callback?ContentService.MimeType.JAVASCRIPT:ContentService.MimeType.JSON);
}

function dashboardData_(ss,now,selectedDate) {
  const settings={};dashboardRows_(ss,'Settings').forEach(row=>{settings[String(row.Key||'')]=row.Value;});
  // The classroom schedule uses Michigan local time, regardless of workbook timezone.
  const tz=String(settings.timezone||'America/Detroit');
  const today=Utilities.formatDate(now,tz,'yyyy-MM-dd');
  if(selectedDate&&!dashboardValidDate_(selectedDate))throw new Error('Invalid requested date');
  const date=selectedDate||today,calendarRows=dashboardRows_(ss,'Calendar');
  const calendar=calendarRows.find(row=>dashboardDate_(row.Date,tz)===date);
  const todayCalendar=calendarRows.find(row=>dashboardDate_(row.Date,tz)===today);
  const schoolCalendar=dashboardSchoolCalendar_(date,today,tz);
  const active=!!calendar&&dashboardActive_(calendar.Active)&&!schoolCalendar.closed;
  const starter=active?dashboardRows_(ss,'Starters').find(row=>Number(row.Week)===Number(calendar.Week)&&String(row.Day).toLowerCase()===String(calendar.Day).toLowerCase()&&dashboardActive_(row.Active)):null;
  const brain=active?dashboardRows_(ss,'Brain Breaks').find(row=>dashboardDate_(row['Date (YYYY-MM-DD)'],tz)===date&&dashboardActive_(row.Active)):null;
  const exitRow=active?dashboardRows_(ss,'Exit Tickets').find(row=>dashboardDate_(row['Date (YYYY-MM-DD)'],tz)===date&&dashboardActive_(row.Active)):null;
  const focus=active?dashboardRows_(ss,'Focus Map').find(row=>Number(row.Week)===Number(calendar.Week)):null;
  const exitPrompt=exitRow?exitRow['Student Prompt']:focus&&focus[String(calendar.Day)+' Exit Ticket'];
  const phaseValues=dashboardRows_(ss,'Dashboard Schedule');
  const phases=DASHBOARD_PHASES.map((phase,i)=>{
    const row=phaseValues.find(r=>Number(r.Order)===i+1),minutes=row?Number(row['Duration (min)']):phase.minutes;
    if(!Number.isFinite(minutes)||minutes<=0)throw new Error('Invalid phase duration');
    return Object.assign({},phase,{minutes:minutes,message:row&&row['Announcement']?String(row.Announcement):phase.message});
  });
  const sessionRows=dashboardRows_(ss,'Dashboard Sessions');
  const sessions=DASHBOARD_SESSIONS.map(session=>{
    const row=sessionRows.find(r=>r.Course===session.name);
    const next=row?{name:session.name,start:dashboardTime_(row.Start,tz),end:dashboardTime_(row.End,tz)}:session;
    if(!/^\d{2}:\d{2}$/.test(next.start)||!/^\d{2}:\d{2}$/.test(next.end))throw new Error('Use HH:mm session times');
    const minutes=s=>Number(s.slice(0,2))*60+Number(s.slice(3));
    if(minutes(next.end)-minutes(next.start)!==phases.reduce((n,p)=>n+p.minutes,0))throw new Error('Phase durations must match session duration');
    return next;
  });
  const mappings=dashboardRows_(ss,'Dashboard Courses');
  return {
    version:1,date:date,today:today,todayInstructionalDay:!!todayCalendar&&dashboardActive_(todayCalendar.Active)&&!schoolCalendar.todayClosed,timezone:tz,title:String(settings.appTitle||'CS Daily Starters'),generatedAt:now.toISOString(),instructionalDay:active,
    schoolCalendar:schoolCalendar,
    learningTarget:active?dashboardLearningTarget_(focus,starter,String(calendar.Day)):'',
    sessions:sessions,phases:phases,
    // Only allowlisted student-facing fields leave Apps Script.
    starter:starter?{
      lens:String(starter.Lens||''),topic:String(starter.Topic||''),csFocus:String(starter['CS Focus']||''),prompt:String(starter['Student Prompt']||''),
      context:String(starter.Context||''),techIcon:String(starter['Tech Icon']||''),iconRole:String(starter['Icon Role']||''),
      iconContribution:String(starter['Icon Contribution']||''),goDeeper:String(starter['Go Deeper']||'')
    }:null,
    brain:brain?{title:String(brain['Activity Title']||''),instructions:String(brain['Student Instructions']||''),returnCue:String(brain['Reflection / Return Cue']||''),duration:Number(brain['Duration (min)'])||10,alternative:String(brain['Accessibility Alternative']||''),resourceUrl:dashboardUrl_(brain['Resource URL'])}:null,
    exit:exitPrompt?{title:exitRow&&exitRow.Title?String(exitRow.Title):'Exit Ticket',prompt:String(exitPrompt),instructions:String(exitRow&&exitRow.Instructions||''),responseUrl:dashboardUrl_(exitRow&&exitRow['Response URL'])}:null,
    courses:DASHBOARD_COURSES.map(name=>{
      const map=mappings.find(row=>row.Course===name);
      if(!map||!map['Classroom Course ID']||!dashboardActive_(map.Active))return {name:name,status:'unconfigured',assignments:[]};
      try{return {name:name,status:'ready',assignments:dashboardCoursework_(String(map['Classroom Course ID']),date,tz)};}
      catch(error){console.error('Classroom retrieval failed for '+name+': '+String(error));return {name:name,status:'error',assignments:[]};}
    })
  };
}

function dashboardCoursework_(courseId,date,tz) {
  const monday=dashboardMonday_(date),nextMonday=dashboardAddDays_(monday,7),items=[];
  let pageToken;
  do{
    const response=Classroom.Courses.CourseWork.list(courseId,{courseWorkStates:['PUBLISHED'],pageSize:100,pageToken:pageToken,fields:'nextPageToken,courseWork(id,title,dueDate,dueTime,alternateLink,assigneeMode)'});
    (response.courseWork||[]).forEach(work=>{
      // This shared display omits assignments targeted to individual students.
      if(work.assigneeMode==='INDIVIDUAL_STUDENTS'||!work.dueDate)return;
      const d=work.dueDate,t=work.dueTime||{};
      const dueAt=new Date(Date.UTC(d.year,d.month-1,d.day,t.hours||0,t.minutes||0,t.seconds||0));
      const local=Utilities.formatDate(dueAt,tz,'yyyy-MM-dd');
      if(local>=monday&&local<nextMonday){
        let submissions=null;
        try{submissions=dashboardSubmissionCounts_(courseId,work.id);}
        catch(error){console.error('Submission totals unavailable for a weekly assignment: '+String(error));}
        items.push({title:String(work.title||'Assignment'),dueAt:dueAt.toISOString(),url:dashboardUrl_(work.alternateLink),submissions:submissions});
      }
    });
    pageToken=response.nextPageToken;
  }while(pageToken);
  return items.sort((a,b)=>a.dueAt.localeCompare(b.dueAt));
}

/** Read states only, then return aggregate totals. No student records leave this function. */
function dashboardSubmissionCounts_(courseId,workId){
  let submitted=0,total=0,pageToken;
  do{
    const response=Classroom.Courses.CourseWork.StudentSubmissions.list(courseId,workId,{
      pageSize:100,pageToken:pageToken,
      fields:'nextPageToken,studentSubmissions(state,submissionHistory(stateHistory(state)))'
    });
    (response.studentSubmissions||[]).forEach(record=>{
      total++;
      const previouslySubmitted=(record.submissionHistory||[]).some(event=>event.stateHistory&&event.stateHistory.state==='TURNED_IN');
      if(record.state==='TURNED_IN'||record.state==='RETURNED'&&previouslySubmitted)submitted++;
    });
    pageToken=response.nextPageToken;
  }while(pageToken);
  return {submitted:submitted,total:total};
}

function dashboardRows_(ss,name) {
  const sheet=ss.getSheetByName(name);if(!sheet||sheet.getLastRow()<2)return [];
  const rows=sheet.getDataRange().getValues(),headers=rows.shift().map(h=>String(h).trim());
  return rows.filter(row=>row.some(v=>v!==''&&v!==null)).map(row=>{const item={};headers.forEach((h,i)=>{if(h)item[h]=row[i];});return item;});
}
function dashboardActive_(value){return !['FALSE','NO','0','N'].includes(String(value==null?'':value).trim().toUpperCase());}
function dashboardDate_(value,tz){if(value instanceof Date)return Utilities.formatDate(value,tz,'yyyy-MM-dd');return String(value||'').trim();}
function dashboardTime_(value,tz){return value instanceof Date?Utilities.formatDate(value,tz,'HH:mm'):String(value||'').trim();}
function dashboardUrl_(value){return /^https:\/\//i.test(String(value||''))?String(value):'';}
function dashboardAddDays_(date,days){const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);}
function dashboardMonday_(date){const day=new Date(date+'T12:00:00Z').getUTCDay();return dashboardAddDays_(date,-((day+6)%7));}
function dashboardValidDate_(date){return /^(19|20|21)\d{2}-\d{2}-\d{2}$/.test(String(date))&&String(date)>='1900-01-01'&&String(date)<='2100-12-31'&&!isNaN(Date.parse(date+'T12:00:00Z'))&&new Date(date+'T12:00:00Z').toISOString().slice(0,10)===date?date:'';}
function dashboardLearningTarget_(focus,starter,day){
  const explicit=focus&&focus[day+' Learning Target']||starter&&starter['Learning Target'];
  if(explicit&&String(explicit).trim())return String(explicit).trim();
  // Legacy content: extract the labeled target only, never the rest of Teacher Notes.
  const notes=String(starter&&starter['Teacher Notes']||'');
  const match=notes.match(/\b(?:weekly\s+)?target:\s*([^\r\n]*?)(?=\s+(?:Success:|AI starter\b|Visible Learning:|Listen for\b|Exit ticket\b)|$)/i);
  const sentence=match&&match[1].trim().match(/^.*?[.!?](?=\s|$)/);
  return sentence?sentence[0]:'';
}

/** Calendar source is the same master used by No_School_Viewer.html. */
function dashboardSchoolCalendar_(date,today,tz){
  try{
    const properties=PropertiesService.getScriptProperties();
    const id=properties.getProperty('NO_SCHOOL_SPREADSHEET_ID')||'17NPFYooBJlMfn-xQi6KRg0c6GT2W8tiAsW48bn2nf94';
    const cache=CacheService.getScriptCache(),key='dashboard:schools:v1:'+id+':'+date+':'+today;
    const cached=cache.get(key);if(cached)return JSON.parse(cached);
    const sheet=SpreadsheetApp.openById(id).getSheetByName('School_Calendar_Master');
    if(!sheet)throw new Error('School calendar tab unavailable');
    const rows=sheet.getRange(1,1,Math.max(1,sheet.getLastRow()),6).getValues();
    const events=dashboardSchoolEvents_(rows,date,tz),todayEvents=date===today?events:dashboardSchoolEvents_(rows,today,tz);
    const data={date:date,status:'ready',events:events,closed:events.some(dashboardGciClosed_),todayClosed:todayEvents.some(dashboardGciClosed_)};
    const encoded=JSON.stringify(data);if(encoded.length<85000)cache.put(key,encoded,900);
    return data;
  }catch(error){console.error('School calendar unavailable: '+String(error));return {date:date,status:'error',events:[],closed:false,todayClosed:false};}
}
function dashboardSchoolEvents_(rows,date,tz){
  if(!rows.length)return [];
  const headers=rows[0].map(h=>String(h).trim().toLowerCase()),column=name=>headers.indexOf(name);
  const di=column('date'),ei=column('event'),si=column('school'),yi=column('school year');
  if(di<0||ei<0||si<0)throw new Error('School calendar headers not recognized');
  const year=Number(date.slice(0,4))-(Number(date.slice(5,7))<7?1:0),schoolYear=year+'-'+String(year+1).slice(-2),seen={};
  return rows.slice(1).filter(row=>dashboardDate_(row[di],tz)===date&&(!row[yi]||String(row[yi]).trim()===schoolYear)).map(row=>({school:String(row[si]||'').trim(),event:String(row[ei]||'').trim()})).filter(item=>{
    const key=item.school+'|'+item.event;if(!item.school||!item.event||seen[key])return false;seen[key]=true;return true;
  }).sort((a,b)=>a.school.localeCompare(b.school));
}
function dashboardGciClosed_(item){
  const school=String(item.school).trim().toLowerCase(),event=String(item.event).toLowerCase();
  if(!['genesee career institute','gci','all schools'].includes(school))return false;
  if(/half.?day|early (release|dismissal)|virtual/.test(event))return false;
  return /no (school|students|regular school)|closed|holiday|winter break|spring break/.test(event);
}

/** Run once after setting DASHBOARD_SPREADSHEET_ID. Adds missing configuration tabs only.
 * Does not change existing rows, sharing settings, or PUBLIC_FEED_ENABLED.
 */
function setupDashboardTabs(){
  const id=PropertiesService.getScriptProperties().getProperty('DASHBOARD_SPREADSHEET_ID');
  if(!id)throw new Error('Set DASHBOARD_SPREADSHEET_ID in Project Settings first.');
  const ss=SpreadsheetApp.openById(id);
  const definitions=[
    {name:'Dashboard Courses',headers:['Course','Classroom Course ID','Active'],rows:DASHBOARD_COURSES.map(name=>[name,'',true])},
    {name:'Dashboard Sessions',headers:['Course','Start','End'],rows:DASHBOARD_SESSIONS.map(s=>[s.name,s.start,s.end])},
    {name:'Dashboard Schedule',headers:['Order','Phase','Duration (min)','Announcement'],rows:DASHBOARD_PHASES.map((p,i)=>[i+1,p.name,p.minutes,p.message])},
    {name:'Exit Tickets',headers:['Date (YYYY-MM-DD)','Title','Student Prompt','Instructions','Response URL','Active'],rows:[]}
  ];
  definitions.forEach(def=>{
    if(ss.getSheetByName(def.name))return;
    const sheet=ss.insertSheet(def.name),values=[def.headers].concat(def.rows);
    sheet.getRange(1,1,sheet.getMaxRows(),def.headers.length).setNumberFormat('@');
    sheet.getRange(1,1,values.length,def.headers.length).setValues(values);
    sheet.setFrozenRows(1);sheet.getRange(1,1,1,def.headers.length).setBackground('#14263a').setFontColor('#ffffff').setFontWeight('bold');
    sheet.autoResizeColumns(1,def.headers.length);
  });
}

/** Run from editor to identify course IDs; output stays in your private execution log. */
function listDashboardClassroomCourses(){
  let token;
  do{
    const response=Classroom.Courses.list({teacherId:'me',courseStates:['ACTIVE'],pageSize:100,pageToken:token,fields:'nextPageToken,courses(id,name,section)'});
    (response.courses||[]).forEach(course=>console.log(course.name+' | '+(course.section||'')+' | '+course.id));
    token=response.nextPageToken;
  }while(token);
}

/** Test privately in the editor before enabling the public feed. */
function testDashboardFeed(){
  const id=PropertiesService.getScriptProperties().getProperty('DASHBOARD_SPREADSHEET_ID');
  const data=dashboardData_(SpreadsheetApp.openById(id),new Date());
  console.log(JSON.stringify({date:data.date,instructionalDay:data.instructionalDay,starter:!!data.starter,brainBreak:!!data.brain,exitTicket:!!data.exit,courses:data.courses.map(c=>({name:c.name,status:c.status,count:c.assignments.length,submissionCountsReady:c.assignments.filter(a=>a.submissions!==null).length}))},null,2));
}
