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
test('selected date determines the planned target even on a no-class day',()=>{
  const ctx=backend();ctx.dashboardSchoolCalendar_=()=>({status:'ready',events:[],closed:false,todayClosed:false});
  const rows={Settings:[['Key','Value'],['timezone','America/Detroit']],Calendar:[['Date','Week','Day','Active'],['2026-11-03',11,'Tuesday',false],['2026-11-04',11,'Wednesday',true]],'Focus Map':[['Week','Tuesday Learning Target','Wednesday Learning Target'],[11,'I can use conditionals.','I can explain Boolean decisions.']]};
  const ss={getSheetByName:name=>rows[name]?sheet(rows[name]):null};
  assert.equal(ctx.dashboardData_(ss,new Date('2026-11-03T12:00:00Z'),'2026-11-04').learningTarget,'I can explain Boolean decisions.');
  const noClass=ctx.dashboardData_(ss,new Date('2026-11-03T12:00:00Z'));
  assert.equal(noClass.learningTarget,'I can use conditionals.');assert.equal(noClass.instructionalDay,false);assert.equal(noClass.starter,null);assert.equal(noClass.exit,null);
});
test('1st and 2nd share a target and 3rd never falls back to the shared target',()=>{
  const data={instructionalDay:true,learningTarget:'Legacy shared',learningTargets:{shared:'Shared target',third:'Third target'}};
  assert.equal(app.learningTargetForSession(data,'1st Session'),'Shared target');
  assert.equal(app.learningTargetForSession(data,'2nd Session'),'Shared target');
  assert.equal(app.learningTargetForSession(data,'3rd Session'),'Third target');
  assert.equal(app.learningTargetForSession({...data,learningTargets:{shared:'Shared target',third:''}},'3rd Session'),'');
  assert.equal(app.learningTargetForSession({instructionalDay:true,learningTarget:'Legacy shared'},'3rd Session'),'');
  assert.equal(app.learningTargetForSession(data,undefined),'');
  assert.equal(app.learningTargetForSession({...data,instructionalDay:false},'3rd Session'),'Third target');
});
test('feed keeps separate weekday targets for the shared and third groups',()=>{
  const ctx=backend(),focus={'Wednesday Learning Target':'Shared conditionals target','Wednesday 3rd Session Learning Target':'Third session target'};
  const targets=ctx.dashboardSessionTargets_(focus,null,'Wednesday');
  assert.equal(targets.shared,'Shared conditionals target');assert.equal(targets.third,'Third session target');
  const legacy=ctx.dashboardSessionTargets_({}, {'Teacher Notes':'Target: Shared legacy target.'},'Wednesday');
  assert.equal(legacy.shared,'Shared legacy target.');assert.equal(legacy.third,'');
});
test('selected-day feed keeps both planned targets available without enabling class activities',()=>{
  const ctx=backend();ctx.dashboardSchoolCalendar_=()=>({status:'ready',events:[],closed:false,todayClosed:false});
  const rows={Settings:[['Key','Value'],['timezone','America/Detroit']],Calendar:[['Date','Week','Day','Active'],['2026-11-03',11,'Tuesday',false],['2026-11-04',11,'Wednesday',true]],'Focus Map':[['Week','Wednesday Learning Target','Wednesday 3rd Session Learning Target','Tuesday Learning Target','Tuesday 3rd Session Learning Target'],[11,'Shared target','Separate third target','Tuesday Intro','Tuesday AP']]};
  const ss={getSheetByName:name=>rows[name]?sheet(rows[name]):null};
  const data=ctx.dashboardData_(ss,new Date('2026-11-03T12:00:00Z'),'2026-11-04');
  assert.equal(data.learningTargets.shared,'Shared target');assert.equal(data.learningTargets.third,'Separate third target');
  const inactive=ctx.dashboardData_(ss,new Date('2026-11-03T12:00:00Z'));assert.equal(inactive.learningTargets.shared,'Tuesday Intro');assert.equal(inactive.learningTargets.third,'Tuesday AP');assert.equal(inactive.todayInstructionalDay,false);assert.equal(inactive.focusPlans.shared,null);
});
test('content defaults to Intro outside class hours and honors active AP and manual previews',()=>{
  const data=fixture();
  assert.equal(app.contentSession(data,'auto',new Date('2026-11-03T23:00:00Z')),'1st Session');
  assert.equal(app.contentSession(data,'auto',new Date('2026-11-03T17:10:00Z')),'3rd Session');
  assert.equal(app.contentSession(data,'third',new Date('2026-11-03T23:00:00Z')),'3rd Session');
  assert.equal(app.contentSession(data,'shared',new Date('2026-11-03T17:10:00Z')),'1st Session');
  assert.equal(app.contentSession({...data,todayInstructionalDay:false},'auto',new Date('2026-11-03T17:10:00Z')),'1st Session');
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
test('adding time extends the deadline without pausing or changing the reset duration',()=>{
  const timer=app.createCountdown(60);timer.start(0);timer.add(30,10000);
  assert.equal(timer.snapshot(10000).remaining,80);assert.equal(timer.snapshot(10000).running,true);
  timer.add(60,20000);assert.equal(timer.snapshot(20000).remaining,130);
  assert.equal(timer.snapshot(30000).remaining,120);assert.equal(timer.snapshot(30000).duration,60);
  timer.reset();assert.equal(timer.snapshot(40000).remaining,60);
});
test('adding time preserves ready or paused state and makes completed timers resumable',()=>{
  const timer=app.createCountdown(60);timer.add(30,0);assert.equal(timer.snapshot(0).mode,'ready');assert.equal(timer.snapshot(0).remaining,90);
  timer.start(0);timer.pause(10000);timer.add(60,20000);
  assert.equal(timer.snapshot(500000).remaining,140);assert.equal(timer.snapshot(500000).mode,'paused');
  timer.start(500000);timer.snapshot(1000000);timer.add(30,1000000);
  assert.equal(timer.snapshot(1001000).remaining,30);assert.equal(timer.snapshot(1001000).mode,'paused');
});
test('time extensions validate input and respect the 180-minute limit',()=>{
  const timer=app.createCountdown(10770);timer.add(30,0);assert.equal(timer.snapshot(0).remaining,10800);
  assert.throws(()=>timer.add(1,0),RangeError);
  for(const seconds of [0,-30,0.5,NaN,Infinity])assert.throws(()=>timer.add(seconds,0),RangeError);
});
test('timer dragging stays within the available viewport',()=>{
  assert.deepEqual(app.timerPosition(300,100,620,500,1280,800),{x:300,y:100});
  assert.deepEqual(app.timerPosition(-100,-100,620,500,1280,800),{x:8,y:8});
  assert.deepEqual(app.timerPosition(5000,5000,620,500,1280,800),{x:652,y:292});
  assert.deepEqual(app.timerPosition(300,100,358,600,390,650),{x:24,y:42});
});
test('Focus plans share 1st/2nd content and keep 3rd separate',()=>{
  const shared={task:'Shared task'},third={task:'Third task'},data={instructionalDay:true,focusPlans:{shared,third}};
  assert.equal(app.focusPlanForSession(data,'1st Session'),shared);assert.equal(app.focusPlanForSession(data,'2nd Session'),shared);
  assert.equal(app.focusPlanForSession(data,'3rd Session'),third);
  assert.equal(app.focusPlanForSession({...data,focusPlans:{shared,third:null}},'3rd Session'),null);
  assert.equal(app.focusPlanForSession(data,undefined),null);assert.equal(app.focusPlanForSession({...data,instructionalDay:false},'1st Session'),null);
});
test('Focus plan lookup selects active dated group rows and exposes only student-facing fields',()=>{
  const ctx=backend();
  const base={'Date (YYYY-MM-DD)':'2026-11-04',Group:'1st/2nd Session',Task:'Use conditionals',Title:'Focus','Step 1':'First','Step 2':'Second','Step 3':'Third','Step 4':'Never exposed','Success Criteria':'One\nTwo\nThree\nFour',Hint:'Try a boundary','Teacher Notes':'PRIVATE','Resource URL':'javascript:alert(1)',Active:true};
  const rows=[{...base,Active:false,Task:'Inactive'},{...base,'Date (YYYY-MM-DD)':'2026-11-05',Task:'Other date'},{...base,Group:'3rd Session',Task:'Third task'},base];
  const plan=ctx.dashboardFocusPlan_(rows,'2026-11-04','1st/2nd Session','America/Detroit');
  assert.equal(plan.task,'Use conditionals');assert.deepEqual(Array.from(plan.steps),['First','Second','Third']);assert.equal(plan.criteria.length,3);
  assert.equal(plan.resourceUrl,'');assert.match(plan.helpRoutine,/I expected/);assert.ok(!JSON.stringify(plan).includes('PRIVATE'));assert.ok(!JSON.stringify(plan).includes('Never exposed'));
  assert.equal(ctx.dashboardFocusPlan_([{...base,Task:''}],'2026-11-04','1st/2nd Session','America/Detroit'),null);
});
test('selected-date feed includes Focus plans and suppresses them on no-class days',()=>{
  const ctx=backend();ctx.dashboardSchoolCalendar_=()=>({status:'ready',events:[],closed:false,todayClosed:false});
  const rows={Settings:[['Key','Value'],['timezone','America/Detroit']],Calendar:[['Date','Week','Day','Active'],['2026-11-03',11,'Tuesday',false],['2026-11-04',11,'Wednesday',true]],'Focus Plans':[['Date (YYYY-MM-DD)','Group','Task','Active'],['2026-11-04','1st/2nd Session','Shared task',true],['2026-11-04','3rd Session','Third task',true]]};
  const ss={getSheetByName:name=>rows[name]?sheet(rows[name]):null};
  const data=ctx.dashboardData_(ss,new Date('2026-11-03T12:00:00Z'),'2026-11-04');
  assert.equal(data.focusPlans.shared.task,'Shared task');assert.equal(data.focusPlans.third.task,'Third task');
  const closed=ctx.dashboardData_(ss,new Date('2026-11-03T12:00:00Z'));assert.equal(closed.focusPlans.shared,null);assert.equal(closed.focusPlans.third,null);
});

test('reminders follow the viewed date, omit inactive rows, and publish text only',()=>{
  const ctx=backend();
  const rows=[{Type:'Date',Date:'2026-11-12',Title:'Blood Drive',Message:'November 12–13 · 7 AM–1 PM',Active:true,Private:'not published'},
    {Type:'Date',Date:'2026-11-13',Title:'Blood Drive',Message:'7 AM–1 PM',Active:'TRUE'},
    {Type:'Date',Date:'2026-11-12',Title:'Hidden',Active:'FALSE'},
    {Type:'Unknown',Title:'Never show',Active:true}];
  const result=ctx.dashboardReminders_(rows,[],'2026-11-12','America/Detroit');
  assert.equal(result.length,1);assert.equal(result[0].title,'Blood Drive');
  assert.deepEqual(Object.keys(result[0]).sort(),['message','title']);
  assert.equal(ctx.dashboardReminders_(rows,[],'2026-11-13','America/Detroit').length,1);
  assert.equal(ctx.dashboardReminders_(rows,[],'2026-11-14','America/Detroit').length,0);
});
test('weekly reminders use the first and last instructional dates of the viewed week',()=>{
  const ctx=backend(),rows=[{Type:'Weekly First Day',Title:'Grade Check',Active:true},{Type:'Weekly Last Day',Title:'Due Today',Active:true}];
  const days=[{Date:'2026-11-09',Active:false},{Date:'2026-11-10',Active:true},{Date:'2026-11-12',Active:true},{Date:'2026-11-13',Active:false}];
  assert.equal(ctx.dashboardReminders_(rows,days,'2026-11-10','America/Detroit')[0].title,'Grade Check');
  assert.equal(ctx.dashboardReminders_(rows,days,'2026-11-12','America/Detroit')[0].title,'Due Today');
  for(const date of ['2026-11-09','2026-11-11','2026-11-13','2026-11-17'])assert.equal(ctx.dashboardReminders_(rows,days,date,'America/Detroit').length,0);
});
test('feed includes dated reminders on a viewed no-class date and tolerates a missing Reminders tab',()=>{
  const ctx=backend();ctx.dashboardSchoolCalendar_=()=>({status:'ready',events:[],closed:false,todayClosed:false});
  const rows={Calendar:[['Date','Week','Day','Active'],['2026-11-12',12,'Thursday',false]],Reminders:[['Type','Date','Title','Message','Active'],['Date','2026-11-12','Blood Drive','7 AM–1 PM',true]]};
  const ss={getSheetByName:name=>rows[name]?sheet(rows[name]):null};
  const data=ctx.dashboardData_(ss,new Date('2026-11-04T12:00:00Z'),'2026-11-12');
  assert.equal(data.reminders[0].title,'Blood Drive');assert.equal(data.instructionalDay,false);
  delete rows.Reminders;
  assert.equal(ctx.dashboardData_(ss,new Date('2026-11-04T12:00:00Z'),'2026-11-12').reminders.length,0);
});
