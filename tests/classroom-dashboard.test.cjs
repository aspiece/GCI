const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const app=require('../assets/dashboard/dashboard.js');
const fixture=()=>({...app.sample(new Date('2026-11-03T12:00:00Z')),instructionalDay:true});
test('sessions open the matching career course',()=>{
  assert.deepEqual(app.sessionCourses('1st Session'),['1st Session','Career Essentials']);
  assert.deepEqual(app.sessionCourses('2nd Session'),['2nd Session','Career Essentials']);
  assert.deepEqual(app.sessionCourses('3rd Session'),['3rd Session','Career Exploration']);
  assert.deepEqual(app.sessionCourses(null),[]);
});
test('schedule moves through both focus blocks and cleanup at exact boundaries',()=>{
  const data=fixture();
  for(const [time,index]of [['12:00:00',0],['12:05:00',1],['12:45:00',2],['12:55:00',3],['13:35:00',4]]){
    const phase=app.scheduled(new Date(`2026-11-03T${time}Z`),data);assert.equal(phase.index,index);assert.ok(phase.remaining>0);
  }
  assert.equal(app.scheduled(new Date('2026-11-03T13:45:00Z'),data),null);
  assert.equal(app.scheduled(new Date('2026-11-03T13:50:00Z'),data).session,'2nd Session');
  assert.equal(app.scheduled(new Date('2026-11-03T17:05:00Z'),data).session,'3rd Session');
});
test('inactive and stale dates do not trigger phases',()=>{
  assert.equal(app.scheduled(new Date('2026-11-03T12:00:00Z'),{...fixture(),instructionalDay:false}),null);
  assert.equal(app.scheduled(new Date('2026-11-04T12:00:00Z'),fixture()),null);
});
test('week handling includes Sunday and Michigan time handles DST',()=>{
  assert.deepEqual(app.weekDates('2026-11-01'),['2026-10-26','2026-10-27','2026-10-28','2026-10-29','2026-10-30','2026-10-31','2026-11-01']);
  assert.equal(app.weekDates('2026-11-02')[0],'2026-11-02');
  assert.equal(app.localParts(new Date('2026-11-02T00:30:00Z')).date,'2026-11-01');
  assert.equal(app.localParts(new Date('2026-10-30T11:00:00Z')).minute,420);
  assert.equal(app.localParts(new Date('2026-11-03T12:00:00Z')).minute,420);
});
test('only HTTPS links and exact Apps Script deployment endpoints are accepted',()=>{
  assert.equal(app.safeUrl('javascript:alert(1)'),'');
  assert.equal(app.safeUrl('http://example.com'),'');
  assert.equal(app.validFeed('https://script.google.com/macros/s/example/exec'),'https://script.google.com/macros/s/example/exec');
  for(const url of ['https://evil.example/macros/s/example/exec','https://script.google.com.evil.example/macros/s/id/exec','https://script.google.com/macros/s/id/exec?callback=bad'])assert.equal(app.validFeed(url),'');
  assert.equal(app.escape('<img src=x onerror=alert(1)>'),'&lt;img src=x onerror=alert(1)&gt;');
});
test('malformed feed is rejected',()=>{assert.throws(()=>app.validate({}));assert.equal(app.validate(fixture()).version,1);});
test('submission badges distinguish unavailable totals from zero and completion',()=>{
  assert.match(app.submissionBadge({submitted:18,total:24}),/18 \/ 24 submitted/);
  assert.match(app.submissionBadge({submitted:0,total:24}),/0 \/ 24 submitted/);
  assert.match(app.submissionBadge({submitted:24,total:24}),/submission-count complete/);
  assert.doesNotMatch(app.submissionBadge({submitted:0,total:0}),/submission-count complete/);
  for(const counts of [null,undefined,{submitted:25,total:24},{submitted:-1,total:24},{submitted:1,total:'24'}])assert.match(app.submissionBadge(counts),/Counts unavailable/);
});

function backend(){
  const context=vm.createContext({console,Date,JSON,Number,String,Object,Array,Math,Error,Utilities:{formatDate(date,tz,format){const p=app.localParts(date,tz);if(format==='yyyy-MM-dd')return p.date;throw new Error(format);}}});
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../apps-script/classroom-dashboard/Code.gs'),'utf8'),context);return context;
}
function sheet(rows){return {getLastRow:()=>rows.length,getDataRange:()=>({getValues:()=>rows.map(r=>r.slice())})};}
test('backend paginates, filters whole-class work, and selects week in local timezone',()=>{
  const ctx=backend(),calls=[];
  ctx.Classroom={Courses:{CourseWork:{list:(id,options)=>{calls.push(options);return options.pageToken?{courseWork:[{title:'Sunday local',dueDate:{year:2026,month:11,day:9},dueTime:{hours:1},assigneeMode:'ALL_STUDENTS'}]}:{nextPageToken:'next',courseWork:[{title:'Monday',dueDate:{year:2026,month:11,day:3},dueTime:{hours:1}},{title:'Individual',dueDate:{year:2026,month:11,day:3},assigneeMode:'INDIVIDUAL_STUDENTS'},{title:'No due date'},{title:'Previous Sunday',dueDate:{year:2026,month:11,day:2},dueTime:{hours:1}},{title:'Next week',dueDate:{year:2026,month:11,day:9},dueTime:{hours:15}}]};}}}};
  const rows=ctx.dashboardCoursework_('123','2026-11-03','America/Detroit');
  assert.deepEqual(Array.from(rows,r=>r.title),['Monday','Sunday local']);assert.equal(calls.length,2);assert.equal(calls[1].pageToken,'next');
});
test('submission totals paginate and include only current submitted work or returned work with turn-in history',()=>{
  const ctx=backend(),calls=[];
  ctx.Classroom={Courses:{CourseWork:{StudentSubmissions:{list:(course,id,options)=>{
    calls.push({course,id,options});
    return options.pageToken?{studentSubmissions:[{state:'TURNED_IN'},{state:'RETURNED',submissionHistory:[{stateHistory:{state:'CREATED'}}]}]}:{nextPageToken:'next',studentSubmissions:[{state:'NEW'},{state:'CREATED'},{state:'TURNED_IN'},{state:'RETURNED',submissionHistory:[{stateHistory:{state:'TURNED_IN'}},{stateHistory:{state:'RETURNED'}}]},{state:'RECLAIMED_BY_STUDENT',submissionHistory:[{stateHistory:{state:'TURNED_IN'}}]}]};
  }}}}};
  const counts=ctx.dashboardSubmissionCounts_('course','work');
  assert.equal(counts.submitted,3);assert.equal(counts.total,7);
  assert.deepEqual(Object.keys(counts).sort(),['submitted','total']);
  assert.equal(calls.length,2);assert.equal(calls[1].options.pageToken,'next');
  assert.equal(calls[0].course,'course');assert.equal(calls[0].id,'work');
  assert.equal(calls[0].options.fields,'nextPageToken,studentSubmissions(state,submissionHistory(stateHistory(state)))');
});
test('empty submissions produce zero totals and failed counts keep deadlines available',()=>{
  const ctx=backend();
  ctx.Classroom={Courses:{CourseWork:{list:()=>({courseWork:[{id:'work',title:'Keep this assignment',dueDate:{year:2026,month:11,day:4},dueTime:{hours:15}}]}),StudentSubmissions:{list:()=>({})}}}};
  assert.equal(ctx.dashboardSubmissionCounts_('course','work').total,0);
  ctx.Classroom.Courses.CourseWork.StudentSubmissions.list=()=>{throw new Error('Permission denied');};
  const work=ctx.dashboardCoursework_('course','2026-11-03','America/Detroit');
  assert.equal(work.length,1);assert.equal(work[0].title,'Keep this assignment');assert.equal(work[0].submissions,null);
});
test('backend reuses Focus Map exit tickets and excludes teacher-only fields',()=>{
  const ctx=backend();
  const rows={Settings:[['Key','Value'],['timezone','America/Detroit']],Calendar:[['Date','Week','Day','Active'],['2026-11-03',11,'Tuesday',true]],Starters:[['Week','Day','Active','Student Prompt','Teacher Notes'],[11,'Tuesday',true,'Student prompt','PRIVATE NOTES']], 'Focus Map':[['Week','Tuesday Exit Ticket'],[11,'Explain a condition']], 'Brain Breaks':[['Date (YYYY-MM-DD)','Activity Title','Student Instructions','Active'],['2026-11-03','Reset','Look away',true]]};
  const ss={getSheetByName:name=>rows[name]?sheet(rows[name]):null};
  const data=ctx.dashboardData_(ss,new Date('2026-11-03T12:00:00Z'));
  assert.equal(data.starter.prompt,'Student prompt');assert.equal(data.exit.prompt,'Explain a condition');assert.equal(data.brain.title,'Reset');assert.ok(!JSON.stringify(data).includes('PRIVATE NOTES'));assert.ok(data.courses.every(c=>c.status==='unconfigured'));
  rows['Exit Tickets']=[['Date (YYYY-MM-DD)','Title','Student Prompt','Active'],['2026-11-03','Override','New prompt',true]];
  assert.equal(ctx.dashboardData_(ss,new Date('2026-11-03T12:00:00Z')).exit.prompt,'New prompt');
  rows.Calendar[1][3]=false;
  const closed=ctx.dashboardData_(ss,new Date('2026-11-03T12:00:00Z'));assert.equal(closed.starter,null);assert.equal(closed.exit,null);assert.equal(closed.brain,null);
});
test('public feed stays disabled unless explicitly enabled and rejects arbitrary callbacks',()=>{
  const ctx=backend();let access=0;
  ctx.PropertiesService={getScriptProperties:()=>({getProperty:()=>null})};
  ctx.SpreadsheetApp={openById:()=>{access++;}};
  ctx.ContentService={MimeType:{JSON:'json',JAVASCRIPT:'js'},createTextOutput:text=>({text,setMimeType(type){this.type=type;return this;}})};
  const disabled=ctx.doGet({parameter:{callback:'gciDashboardFeed',requestId:'1'}});
  assert.ok(disabled.text.startsWith('gciDashboardFeed('));assert.ok(disabled.text.includes('unavailable'));assert.equal(access,0);
  assert.equal(ctx.doGet({parameter:{callback:'alert'}}).text,'Invalid callback.');
});
