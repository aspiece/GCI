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
  assert.equal(app.scheduled(new Date('2026-11-03T12:00:00Z'),{...fixture(),instructionalDay:false,todayInstructionalDay:false}),null);
  assert.equal(app.scheduled(new Date('2026-11-04T12:00:00Z'),fixture()),null);
});
test('week handling includes Sunday and Michigan time handles DST',()=>{
  assert.deepEqual(app.weekDates('2026-11-01'),['2026-10-26','2026-10-27','2026-10-28','2026-10-29','2026-10-30','2026-10-31','2026-11-01']);
  assert.equal(app.weekDates('2026-11-02')[0],'2026-11-02');
  assert.equal(app.localParts(new Date('2026-11-02T00:30:00Z')).date,'2026-11-01');
  assert.equal(app.localParts(new Date('2026-10-30T11:00:00Z')).minute,420);
  assert.equal(app.localParts(new Date('2026-11-03T12:00:00Z')).minute,420);
});
test('date browsing uses today for phase timing and validates real calendar dates',()=>{
  const data={...fixture(),date:'2026-11-04',instructionalDay:false};
  assert.equal(app.scheduled(new Date('2026-11-03T12:05:00Z'),data).index,1);
  assert.equal(app.scheduled(new Date('2026-11-03T12:05:00Z'),{...data,todayInstructionalDay:false}),null);
  for(const date of ['2026-11-04','2028-02-29'])assert.equal(app.validDate(date),true);
  for(const date of ['2026-02-29','2026-11-31','2026-13-01','2101-01-01','11/04/2026',''])assert.equal(app.validDate(date),false);
  assert.equal(app.addDays('2026-12-31',1),'2027-01-01');
  assert.equal(app.sample(new Date('2026-11-03T12:00:00Z'),'2026-11-09').date,'2026-11-09');
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
  const context=vm.createContext({console:{...console,error(){}},Date,JSON,Number,String,Object,Array,Math,Error,Utilities:{formatDate(date,tz,format){const p=app.localParts(date,tz);if(format==='yyyy-MM-dd')return p.date;throw new Error(format);}}});
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
test('backend loads selected date activities while keeping today’s class calendar separate',()=>{
  const ctx=backend();
  const rows={Settings:[['Key','Value'],['timezone','America/Detroit']],Calendar:[['Date','Week','Day','Active'],['2026-11-03',11,'Tuesday',false],['2026-11-04',11,'Wednesday',true]],Starters:[['Week','Day','Student Prompt','Active'],[11,'Wednesday','Tomorrow’s starter',true]],'Focus Map':[['Week','Wednesday Exit Ticket'],[11,'Tomorrow’s exit']]};
  const data=ctx.dashboardData_({getSheetByName:name=>rows[name]?sheet(rows[name]):null},new Date('2026-11-03T12:00:00Z'),'2026-11-04');
  assert.equal(data.date,'2026-11-04');assert.equal(data.today,'2026-11-03');assert.equal(data.instructionalDay,true);assert.equal(data.todayInstructionalDay,false);
  assert.equal(data.starter.prompt,'Tomorrow’s starter');assert.equal(data.exit.prompt,'Tomorrow’s exit');
  assert.throws(()=>ctx.dashboardData_({getSheetByName:()=>null},new Date('2026-11-03T12:00:00Z'),'2026-02-30'));
  assert.equal(ctx.dashboardValidDate_('2028-02-29'),'2028-02-29');
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
test('feed caches each selected date independently',()=>{
  const ctx=backend(),cache=new Map(),requests=[];
  const today=app.localParts(new Date()).date;
  ctx.PropertiesService={getScriptProperties:()=>({getProperty:key=>key==='PUBLIC_FEED_ENABLED'?'true':'sheet-id'})};
  ctx.CacheService={getScriptCache:()=>({get:key=>cache.get(key),put:(key,value)=>cache.set(key,value)})};
  ctx.SpreadsheetApp={openById:()=>({})};
  ctx.dashboardData_=(_ss,_now,date)=>{requests.push(date);return {today,date};};
  ctx.ContentService={MimeType:{JSON:'json',JAVASCRIPT:'js'},createTextOutput:text=>({text,setMimeType(){return this;}})};
  for(const date of ['2026-11-04','2026-11-05','2026-11-04'])assert.equal(JSON.parse(ctx.doGet({parameter:{date}}).text).date,date);
  assert.deepEqual(requests,['2026-11-04','2026-11-05']);
});
test('school calendar filters date/year, removes duplicates, and excludes private/source columns',()=>{
  const ctx=backend();
  const rows=[['Date','Event','School','school year','source','last verified'],['2026-11-03','No School','School A','2026-27','PRIVATE SOURCE','2026-08-01'],['2026-11-03','No School','School A','2026-27'],['2026-11-04','No School','School B','2026-27'],['2026-11-03','No School','School C','2025-26']];
  const events=ctx.dashboardSchoolEvents_(rows,'2026-11-03','America/Detroit');
  assert.equal(events.length,1);assert.equal(events[0].school,'School A');assert.deepEqual(Object.keys(events[0]).sort(),['event','school']);
  assert.ok(!JSON.stringify(events).includes('PRIVATE SOURCE'));
});
test('only explicit GCI/all-school full closures pause timing, not feeder closures, virtual, or half days',()=>{
  const ctx=backend();
  for(const event of ['No School - Professional Development','PD - No Students','Holiday'])assert.equal(ctx.dashboardGciClosed_({school:'Genesee Career Institute',event}),true);
  for(const event of ['Virtual Day - 10th Grade Showcase','Half Day','Early Dismissal'])assert.equal(ctx.dashboardGciClosed_({school:'Genesee Career Institute',event}),false);
  assert.equal(ctx.dashboardGciClosed_({school:'Fenton High School',event:'No School - GCI students must attend'}),false);
  assert.equal(ctx.dashboardGciClosed_({school:'All Schools',event:'No School'}),true);
});
test('school calendar reads shared master, caches notices, and isolates failure',()=>{
  const ctx=backend(),cache=new Map();let reads=0;
  ctx.PropertiesService={getScriptProperties:()=>({getProperty:()=>null})};
  ctx.CacheService={getScriptCache:()=>({get:key=>cache.get(key),put:(key,value)=>cache.set(key,value)})};
  ctx.SpreadsheetApp={openById:id=>{assert.equal(id,'17NPFYooBJlMfn-xQi6KRg0c6GT2W8tiAsW48bn2nf94');reads++;return {getSheetByName:()=>({getLastRow:()=>3,getRange:()=>({getValues:()=>[['Date','Event','School','school year'],['2026-11-03','No School','Genesee Career Institute','2026-27'],['2026-11-04','Half Day','School A','2026-27']]})})};}};
  const a=ctx.dashboardSchoolCalendar_('2026-11-04','2026-11-03','America/Detroit');
  assert.equal(a.closed,false);assert.equal(a.todayClosed,true);assert.equal(a.events[0].school,'School A');
  ctx.dashboardSchoolCalendar_('2026-11-04','2026-11-03','America/Detroit');assert.equal(reads,1);
  ctx.SpreadsheetApp.openById=()=>{throw new Error('No access');};
  assert.equal(ctx.dashboardSchoolCalendar_('2026-11-05','2026-11-03','America/Detroit').status,'error');
});
test('a GCI closure suppresses activities and live timing while a feeder notice does not',()=>{
  const ctx=backend();
  const rows={Settings:[['Key','Value'],['timezone','America/Detroit']],Calendar:[['Date','Week','Day','Active'],['2026-11-03',11,'Tuesday',true]],Starters:[['Week','Day','Student Prompt','Active'],[11,'Tuesday','Prompt',true]]};
  const ss={getSheetByName:name=>rows[name]?sheet(rows[name]):null};
  ctx.dashboardSchoolCalendar_=()=>({status:'ready',events:[],closed:true,todayClosed:true});
  const closed=ctx.dashboardData_(ss,new Date('2026-11-03T12:00:00Z'));
  assert.equal(closed.instructionalDay,false);assert.equal(closed.todayInstructionalDay,false);assert.equal(closed.starter,null);
  ctx.dashboardSchoolCalendar_=()=>({status:'ready',events:[{school:'Fenton High School',event:'No School'}],closed:false,todayClosed:false});
  const open=ctx.dashboardData_(ss,new Date('2026-11-03T12:00:00Z'));
  assert.equal(open.todayInstructionalDay,true);assert.equal(open.starter.prompt,'Prompt');
});
test('daily learning targets prefer the selected weekday Focus Map field',()=>{
  const ctx=backend();
  assert.equal(ctx.dashboardLearningTarget_({'Wednesday Learning Target':'I can test decisions.'},{'Learning Target':'Other target','Teacher Notes':'Target: Legacy.'},'Wednesday'),'I can test decisions.');
  assert.equal(ctx.dashboardLearningTarget_({}, {'Learning Target':'Explicit starter target'},'Wednesday'),'Explicit starter target');
});
test('legacy target extraction never publishes the surrounding teacher notes',()=>{
  const ctx=backend();
  assert.equal(ctx.dashboardLearningTarget_(null,{'Teacher Notes':'Weekly target: I can combine Boolean operators and explain the resulting decisions. AI starter reviews lessons 4-5. Exit ticket on Focus Map tab.'},'Wednesday'),'I can combine Boolean operators and explain the resulting decisions.');
  assert.equal(ctx.dashboardLearningTarget_(null,{'Teacher Notes':'Target: Explain a conditional. Success: Explain one branch. Listen for PRIVATE CLASS NOTES.'},'Monday'),'Explain a conditional.');
  assert.equal(ctx.dashboardLearningTarget_(null,{'Teacher Notes':'PRIVATE NOTES WITHOUT A LABELED TARGET'},'Monday'),'');
  assert.equal(ctx.dashboardLearningTarget_(null,{'Teacher Notes':'Target: Explain a conditional. PRIVATE CLASS NOTES.'},'Monday'),'Explain a conditional.');
});
test('selected date determines the learning target and inactive dates hide it',()=>{
  const ctx=backend();ctx.dashboardSchoolCalendar_=()=>({status:'ready',events:[],closed:false,todayClosed:false});
  const rows={Settings:[['Key','Value'],['timezone','America/Detroit']],Calendar:[['Date','Week','Day','Active'],['2026-11-03',11,'Tuesday',false],['2026-11-04',11,'Wednesday',true]],'Focus Map':[['Week','Wednesday Learning Target'],[11,'I can explain Boolean decisions.']]};
  const ss={getSheetByName:name=>rows[name]?sheet(rows[name]):null};
  assert.equal(ctx.dashboardData_(ss,new Date('2026-11-03T12:00:00Z'),'2026-11-04').learningTarget,'I can explain Boolean decisions.');
  assert.equal(ctx.dashboardData_(ss,new Date('2026-11-03T12:00:00Z')).learningTarget,'');
});
test('1st and 2nd share a target and 3rd never falls back to the shared target',()=>{
  const data={instructionalDay:true,learningTarget:'Legacy shared',learningTargets:{shared:'Shared target',third:'Third target'}};
  assert.equal(app.learningTargetForSession(data,'1st Session'),'Shared target');
  assert.equal(app.learningTargetForSession(data,'2nd Session'),'Shared target');
  assert.equal(app.learningTargetForSession(data,'3rd Session'),'Third target');
  assert.equal(app.learningTargetForSession({...data,learningTargets:{shared:'Shared target',third:''}},'3rd Session'),'');
  assert.equal(app.learningTargetForSession({instructionalDay:true,learningTarget:'Legacy shared'},'3rd Session'),'');
  assert.equal(app.learningTargetForSession(data,undefined),'');
  assert.equal(app.learningTargetForSession({...data,instructionalDay:false},'3rd Session'),'');
});
test('feed keeps separate weekday targets for the shared and third groups',()=>{
  const ctx=backend(),focus={'Wednesday Learning Target':'Shared conditionals target','Wednesday 3rd Session Learning Target':'Third session target'};
  const targets=ctx.dashboardSessionTargets_(focus,null,'Wednesday');
  assert.equal(targets.shared,'Shared conditionals target');assert.equal(targets.third,'Third session target');
  const legacy=ctx.dashboardSessionTargets_({}, {'Teacher Notes':'Target: Shared legacy target.'},'Wednesday');
  assert.equal(legacy.shared,'Shared legacy target.');assert.equal(legacy.third,'');
});
test('selected-day feed exposes both target groups and blanks both on inactive days',()=>{
  const ctx=backend();ctx.dashboardSchoolCalendar_=()=>({status:'ready',events:[],closed:false,todayClosed:false});
  const rows={Settings:[['Key','Value'],['timezone','America/Detroit']],Calendar:[['Date','Week','Day','Active'],['2026-11-03',11,'Tuesday',false],['2026-11-04',11,'Wednesday',true]],'Focus Map':[['Week','Wednesday Learning Target','Wednesday 3rd Session Learning Target'],[11,'Shared target','Separate third target']]};
  const ss={getSheetByName:name=>rows[name]?sheet(rows[name]):null};
  const data=ctx.dashboardData_(ss,new Date('2026-11-03T12:00:00Z'),'2026-11-04');
  assert.equal(data.learningTargets.shared,'Shared target');assert.equal(data.learningTargets.third,'Separate third target');
  const inactive=ctx.dashboardData_(ss,new Date('2026-11-03T12:00:00Z'));assert.equal(inactive.learningTargets.shared,'');assert.equal(inactive.learningTargets.third,'');
});
test('countdown uses a deadline and keeps its configured duration',()=>{
  const timer=app.createCountdown(60);assert.equal(timer.snapshot(0).remaining,60);assert.equal(timer.snapshot(0).mode,'ready');
  timer.start(1000);assert.equal(timer.snapshot(11000).remaining,50);assert.equal(timer.snapshot(21000).remaining,40);
  timer.start(21000);assert.equal(timer.snapshot(31000).remaining,30);assert.equal(timer.snapshot(31000).running,true);
});
test('countdown pause and resume preserve fractional remaining time',()=>{
  const timer=app.createCountdown(60);timer.start(0);timer.pause(1250);
  assert.equal(timer.snapshot(500000).remaining,59);assert.equal(timer.snapshot(500000).mode,'paused');
  timer.start(500000);assert.equal(timer.snapshot(501000).remaining,58);
  timer.pause(502000);assert.equal(timer.snapshot(900000).remaining,57);
});
test('countdown completes after background time, stays complete, and restarts cleanly',()=>{
  const timer=app.createCountdown(60);timer.start(0);
  assert.equal(timer.snapshot(200000).remaining,0);assert.equal(timer.snapshot(200000).completed,true);
  timer.pause(200001);assert.equal(timer.snapshot(300000).mode,'done');
  timer.start(300000);assert.equal(timer.snapshot(300000).remaining,60);assert.equal(timer.snapshot(300000).running,true);
});
test('countdown reset and duration changes stop it and reject invalid durations',()=>{
  const timer=app.createCountdown(300);timer.start(0);timer.snapshot(1000);timer.reset();
  assert.equal(timer.snapshot(5000).remaining,300);assert.equal(timer.snapshot(5000).mode,'ready');
  timer.configure(180);assert.equal(timer.snapshot().remaining,180);
  for(const seconds of [0,-1,1.5,NaN,Infinity,10801])assert.throws(()=>timer.configure(seconds),RangeError);
  timer.configure(10800);assert.equal(timer.snapshot().remaining,10800);
});
