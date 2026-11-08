'use strict';
const GCI = (() => {
  const courses = ['1st Session', '2nd Session', '3rd Session', 'Career Essentials', 'Career Exploration'];
  const phases = [
    {name:'Daily Starter', minutes:5, icon:'✦', message:'Think, share, and build on an idea.'},
    {name:'Focus', minutes:40, icon:'◎', message:'Begin your work. Take your next step.'},
    {name:'Brain Break', minutes:10, icon:'☀', message:'Pause your work and reset your attention.'},
    {name:'Focus', minutes:40, icon:'◎', message:'Return to your work with a fresh perspective.'},
    {name:'Cleanup', minutes:10, icon:'✓', message:'Save your work and reset your space.'}
  ];
  const sessions = courses.slice(0,3).map((name,i)=>({name,start:['07:00','08:50','12:05'][i],end:['08:45','10:35','13:50'][i]}));
  function sessionCourses(session){
    if(session==='1st Session'||session==='2nd Session')return [session,'Career Essentials'];
    if(session==='3rd Session')return [session,'Career Exploration'];
    return [];
  }
  function localParts(now, tz='America/Detroit') {
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(now).map(p=>[p.type,p.value]));
    return {date:`${parts.year}-${parts.month}-${parts.day}`,minute:Number(parts.hour)*60+Number(parts.minute)+Number(parts.second)/60};
  }
  function addDays(iso,n){const d=new Date(`${iso}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);}
  function validDate(value){return typeof value==='string'&&/^(19|20|21)\d{2}-\d{2}-\d{2}$/.test(value)&&value>='1900-01-01'&&value<='2100-12-31'&&!isNaN(Date.parse(value+'T12:00:00Z'))&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value;}
  function weekDates(iso){const day=new Date(`${iso}T12:00:00Z`).getUTCDay();const monday=addDays(iso,-((day+6)%7));return Array.from({length:7},(_,i)=>addDays(monday,i));}
  function minuteOf(s){const [h,m]=String(s).split(':').map(Number);return h*60+m;}
  function scheduled(now,data){
    const local=localParts(now,data.timezone);
    if(local.date!==(data.today||data.date)||!(data.todayInstructionalDay??data.instructionalDay))return null;
    for(const session of data.sessions||sessions){
      const start=minuteOf(session.start),end=minuteOf(session.end);
      if(local.minute<start||local.minute>=end)continue;
      let offset=0;
      for(let i=0;i<(data.phases||phases).length;i++){
        const phase=(data.phases||phases)[i];
        if(local.minute<start+offset+phase.minutes)return {session:session.name,index:i,remaining:Math.max(0,Math.ceil((start+offset+phase.minutes-local.minute)*60)),sessionEnd:now.getTime()+(end-local.minute)*60000,key:`${local.date}:${session.name}:${i}`};
        offset+=phase.minutes;
      }
    }
    return null;
  }
  function safeUrl(value){try{const u=new URL(value);return u.protocol==='https:'?u.href:'';}catch{return '';}}
  function validFeed(value){try{const u=new URL(value);return u.origin==='https://script.google.com'&&/^\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(u.pathname)&&!u.search&&!u.hash?u.href:'';}catch{return '';}}
  function escape(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function submissionBadge(counts){
    if(!counts||!Number.isInteger(counts.submitted)||!Number.isInteger(counts.total)||counts.total<0||counts.submitted<0||counts.submitted>counts.total)return '<span class="submission-count unavailable">Counts unavailable</span>';
    const complete=counts.total>0&&counts.submitted===counts.total;
    return `<span class="submission-count${complete?' complete':''}" aria-label="${counts.submitted} of ${counts.total} assigned students submitted">${counts.submitted} / ${counts.total} submitted</span>`;
  }
  function learningTargetForSession(data,session){
    if(!data)return '';
    let target='';
    if(session==='3rd Session')target=data.learningTargets?.third;
    else if(session==='1st Session'||session==='2nd Session')target=data.learningTargets?.shared??data.learningTarget;
    return typeof target==='string'?target.trim():'';
  }
  function contentSession(data,group='auto',now=new Date()){
    if(group==='third')return '3rd Session';
    if(group==='shared')return '1st Session';
    return data&&scheduled(now,data)?.session||'1st Session';
  }
  function focusPlanForSession(data,session){
    if(!data?.instructionalDay)return null;
    const group=session==='3rd Session'?'third':session==='1st Session'||session==='2nd Session'?'shared':null;
    const plan=group&&data.focusPlans?.[group];
    return plan&&typeof plan.task==='string'&&plan.task.trim()?plan:null;
  }
  function createCountdown(initialSeconds=300){
    let duration,remainingMs,deadline=null,mode='ready';
    function configure(seconds){
      if(!Number.isInteger(seconds)||seconds<1||seconds>10800)throw new RangeError('Choose a timer duration from 1 second to 180 minutes.');
      duration=seconds;reset();
    }
    function reset(){remainingMs=duration*1000;deadline=null;mode='ready';}
    function snapshot(now=Date.now()){
      if(deadline!==null){remainingMs=Math.max(0,deadline-now);if(remainingMs===0){deadline=null;mode='done';}}
      return {duration,remaining:Math.ceil(remainingMs/1000),mode,running:mode==='running',completed:mode==='done'};
    }
    function start(now=Date.now()){
      const state=snapshot(now);if(state.running)return;
      if(state.completed)reset();
      deadline=now+remainingMs;mode='running';
    }
    function pause(now=Date.now()){if(snapshot(now).running){deadline=null;mode='paused';}}
    function add(seconds,now=Date.now()){
      if(!Number.isInteger(seconds)||seconds<1)throw new RangeError('Added time must be a positive number of seconds.');
      const state=snapshot(now);
      if(remainingMs+seconds*1000>10800000)throw new RangeError('Timer cannot exceed 180 minutes.');
      remainingMs+=seconds*1000;
      if(state.running)deadline=now+remainingMs;
      else if(state.completed)mode='paused';
    }
    configure(initialSeconds);
    return {configure,reset,snapshot,start,pause,add};
  }
  function timerPosition(x,y,width,height,viewportWidth,viewportHeight){
    return {x:Math.max(8,Math.min(x,Math.max(8,viewportWidth-width-8))),y:Math.max(8,Math.min(y,Math.max(8,viewportHeight-height-8)))};
  }
  function validate(data){
    if(!data||data.version!==1||!/^\d{4}-\d{2}-\d{2}$/.test(data.date)||!Array.isArray(data.courses)||!Array.isArray(data.sessions)||!Array.isArray(data.phases)||data.phases.length!==5)throw new Error('The feed is not a dashboard feed.');
    new Intl.DateTimeFormat('en',{timeZone:data.timezone}).format();
    if(data.phases.some(p=>!Number.isFinite(p.minutes)||p.minutes<=0)||data.sessions.some(s=>!/^\d{2}:\d{2}$/.test(s.start)||!/^\d{2}:\d{2}$/.test(s.end)||minuteOf(s.start)>=minuteOf(s.end)))throw new Error('Check the class schedule in the feed.');
    return data;
  }
  function sample(now=new Date(),selectedDate=''){
    const today=localParts(now).date,date=selectedDate||today,week=weekDates(date);
    return {version:1,date,today,todayInstructionalDay:true,timezone:'America/Detroit',title:'CS Daily Starters',generatedAt:now.toISOString(),instructionalDay:true,learningTarget:'I can test boundary cases and explain how a conditional selects a path.',learningTargets:{shared:'I can test boundary cases and explain how a conditional selects a path.',third:'I can explain and test a method’s behavior.'},focusPlans:{shared:{title:'Build and test your decisions',task:'Use conditionals to complete your current Python task.',steps:['Identify the inputs and decision rules.','Write your conditionals and test each branch.','Explain a boundary test and its result.'],criteria:['I can choose if, elif, and else.','I can explain which branch runs.','I can test a boundary value.'],hint:'Write the decision in plain language. Test a value below, at, and above the boundary.',helpRoutine:'I expected ___.\nInstead, ___.\nI tried ___.',resourceUrl:'https://cs50.dev/',resourceLabel:'Open workspace'},third:{title:'Explain and test a method',task:'Complete the method task assigned by your instructor.',steps:['Identify its inputs and expected result.','Build and test one method.','Explain a test to a partner.'],criteria:['I can explain the method’s behavior.','I can test an expected result.'],hint:'Start with one concrete input and expected result.',helpRoutine:'I expected ___.\nInstead, ___.\nI tried ___.'}},sessions,phases,
      starter:{lens:'Design Lab',topic:'Make the next step clear',csFocus:'Conditionals',prompt:'A game needs to explain why a player cannot open a locked door. How could the message help the player decide what to try next?',context:'Think for a moment. Discuss at your table. Be ready to explain one design choice.',goDeeper:'How should the message change when the player has the key but needs more energy?'},
      brain:{title:'Look up & reset',instructions:'Look away from the screen. Stretch gently if comfortable, then share one small win with your table.',alternative:'Stay seated, rest, or choose a comfortable movement.',returnCue:'Choose your next step before returning to your work.',duration:10},
      exit:{title:'Make your thinking visible',prompt:'Describe one conditional you tested today. What input did you try, what happened, and what would you test next?'},
      courses:courses.map((name,i)=>({name,status:'ready',assignments:i<3?[{title:['Conditionals practice','Test a decision','Explain your solution'][i],dueAt:`${week[i+1]}T20:00:00.000Z`,url:'https://classroom.google.com/',submissions:{submitted:[18,21,24][i],total:24}}]:[]}))};
  }
  return {courses,phases,sessions,sessionCourses,localParts,weekDates,addDays,validDate,scheduled,safeUrl,validFeed,escape,submissionBadge,learningTargetForSession,contentSession,focusPlanForSession,createCountdown,timerPosition,validate,sample};
})();
if(typeof module!=='undefined')module.exports=GCI;
if(typeof document!=='undefined'){
  const $=id=>document.getElementById(id),esc=GCI.escape;
  const defaultFeedUrl='https://script.google.com/macros/s/AKfycbw4Rj6Xqlz61dI8N8jg9v8ehWSgkbLsCLF1ZSUZHk1RzSGf_s5ZDutLj4KfqQYLzQ/exec';
  let data=null,tab='starter',preview=false,feedUrl='',inflight=false,lastKey=null,manual=null,lastSession=null,announcementTimer=null,soundContext=null,generation=0,lastAttempt=0,selectedDate='',showAllCourses=false,targetGroup='auto',focusPanel='task',focusContext='';
  const openCourses=new Map();
  const store={get(key){try{return localStorage.getItem(key)||'';}catch{return '';}},set(key,value){try{localStorage.setItem(key,value);}catch{}}};
  let sound=store.get('gci.dashboard.sound')==='true';
  const countdown=GCI.createCountdown();
  let timerNotified=false,timerLocation=null,timerDrag=null;
  function positionCountdown(x,y){
    const dialog=$('countdown-dialog'),rect=dialog.getBoundingClientRect();
    timerLocation=GCI.timerPosition(x,y,rect.width,rect.height,window.innerWidth,window.innerHeight);
    Object.assign(dialog.style,{left:timerLocation.x+'px',top:timerLocation.y+'px',right:'auto',bottom:'auto',margin:'0'});
  }
  function centerCountdown(){
    timerLocation=null;
    ['left','top','right','bottom','margin'].forEach(property=>$('countdown-dialog').style.removeProperty(property));
  }
  function stopTimerDrag(){
    const handle=$('timer-drag-handle'),id=timerDrag?.id;timerDrag=null;handle.classList.remove('dragging');
    if(id!==undefined&&handle.hasPointerCapture(id))handle.releasePointerCapture(id);
  }
  function openCountdown(){if(!$('countdown-dialog').open)$('countdown-dialog').show();if(timerLocation)positionCountdown(timerLocation.x,timerLocation.y);$('timer-open').setAttribute('aria-expanded','true');}
  function renderCountdown(){
    const state=countdown.snapshot(),text=`${Math.floor(state.remaining/60).toString().padStart(2,'0')}:${(state.remaining%60).toString().padStart(2,'0')}`;
    if($('timer-value').textContent!==text)$('timer-value').textContent=text;
    $('timer-value').classList.toggle('finished',state.completed);
    const toggleLabel=state.running?'Pause':state.completed?'Restart':state.mode==='paused'?'Resume':'Start';
    if($('timer-toggle').textContent!==toggleLabel)$('timer-toggle').textContent=toggleLabel;
    $('timer-minutes').disabled=state.running;
    document.querySelectorAll('[data-minutes]').forEach(button=>button.disabled=state.running);
    document.querySelectorAll('[data-add-seconds]').forEach(button=>button.disabled=state.remaining+Number(button.dataset.addSeconds)>10800);
    const label=state.completed?'Time’s up!':state.running?'Counting down':state.mode==='paused'?'Paused':'Ready';
    if($('timer-status').textContent!==label)$('timer-status').textContent=label;
    const headerLabel=state.mode==='ready'?'Timer':state.completed?'Timer · Done':`Timer ${text}`;
    if($('timer-open').textContent!==headerLabel)$('timer-open').textContent=headerLabel;
    if(state.completed&&!timerNotified){timerNotified=true;openCountdown();playChime();}
  }
  function configureCountdown(minutes){
    if(!Number.isInteger(minutes)||minutes<1||minutes>180){$('timer-minutes').reportValidity();return;}
    countdown.configure(minutes*60);timerNotified=false;$('timer-minutes').value=minutes;renderCountdown();
  }
  function status(text,kind=''){$('connection').textContent=text;$('connection').className=`connection ${kind}`;}
  function currentPhase(now=new Date()){
    if(manual&&now.getTime()>=manual.expires){manual=null;lastKey=null;}
    if(manual)return {...manual,remaining:Math.max(0,Math.ceil((manual.ends-now.getTime())/1000))};
    return data?GCI.scheduled(now,data):null;
  }
  let lastAutoPhaseKey='',manualTabPhaseKey='';
  function selectTab(next){tab=next;if(next==='focus')focusPanel='task';document.querySelectorAll('[data-tab]').forEach(b=>{const selected=b.dataset.tab===tab;b.setAttribute('aria-selected',String(selected));b.tabIndex=selected?0:-1;});$('activity-panel').setAttribute('aria-labelledby',`tab-${tab}`);renderContent();}
  function link(url,label){const safe=GCI.safeUrl(url);return safe?`<a href="${esc(safe)}" target="_blank" rel="noopener noreferrer">${esc(label)} ↗</a>`:'';}
  function viewedSession(){return GCI.contentSession(data,targetGroup);}
  function renderLearningTarget(){
    const session=viewedSession();
    const target=GCI.learningTargetForSession(data,session);
    const course=session==='3rd Session'?'AP':'Intro';
    $('learning-target').hidden=!data;
    $('target-text').textContent=target||`No ${course} learning target is available for this date.`;
    $('target-course').textContent=course;
  }
  function renderFocus(){
    const session=viewedSession(),plan=GCI.focusPlanForSession(data,session),context=data.date+'|'+(session==='3rd Session'?'third':session?'shared':'none');
    if(context!==focusContext){focusContext=context;focusPanel='task';}
    if(!plan){$('activity-panel').innerHTML=`<div class="empty"><div class="eyebrow">FOCUS</div><h1>Focus plan</h1><p>${session?'No Focus plan is scheduled for this date and session.':'Choose a session group in Instructor to preview its Focus plan.'}</p></div>`;return;}
    const steps=Array.isArray(plan.steps)?plan.steps.slice(0,3):[],criteria=Array.isArray(plan.criteria)?plan.criteria.slice(0,3):[];
    if(focusPanel==='criteria'&&!criteria.length||focusPanel==='hint'&&!plan.hint)focusPanel='task';
    const controls=[['task',focusPanel==='task'?'Task':'← Back to task'],...(criteria.length?[['criteria','Success criteria']]:[]),...(plan.hint?[['hint','Hint']]:[]),['help','Help']];
    let content='';
    if(focusPanel==='criteria')content=`<h1>Success criteria</h1><ul class="focus-criteria">${criteria.map(item=>`<li>${esc(item)}</li>`).join('')}</ul>`;
    else if(focusPanel==='hint')content=`<h1>Try this next</h1><div class="focus-support">${esc(plan.hint)}</div>`;
    else if(focusPanel==='help')content=`<h1>Explain where you’re stuck</h1><div class="focus-support">${esc(plan.helpRoutine||'I expected ___.\nInstead, ___.\nI tried ___.')}</div>`;
    else content=`<h1>${esc(plan.title||'Focus')}</h1><div class="focus-task">${esc(plan.task)}</div>${steps.length?`<ol class="focus-steps">${steps.map(item=>`<li>${esc(item)}</li>`).join('')}</ol>`:''}${GCI.safeUrl(plan.resourceUrl)?`<div class="focus-resource">${link(plan.resourceUrl,plan.resourceLabel||'Open work')}</div>`:''}`;
    $('activity-panel').innerHTML=`<div class="focus-topline"><div class="eyebrow">FOCUS</div><div class="focus-controls" role="group" aria-label="Focus supports">${controls.map(([key,label])=>`<button data-focus-panel="${key}" aria-pressed="${focusPanel===key}">${esc(label)}</button>`).join('')}</div></div><div class="focus-view">${content}</div>`;
  }
  let qotdStage=0,qotdDate='';
  function renderQotd(q){
    const labels=['THINK','PAIR','SHARE','REVEAL'];
    const prompts=['Predict the answer on your whiteboard.','Compare with your partner and explain why.','Raise your whiteboards together.','Review the correct answer and reasoning.'];
    const steps=labels.map((label,i)=>`<button type="button" data-qotd-stage="${i}" aria-pressed="${qotdStage===i}">${label}</button>`).join('');
    $('activity-panel').innerHTML=`<div class="qotd"><div class="eyebrow">PYTHON · QUESTION OF THE DAY</div><h1>${esc(q.title||'Daily Python Challenge')}</h1><p class="qotd-question">${esc(q.question)}</p>${q.code?`<pre class="qotd-code"><code>${esc(q.code)}</code></pre>`:''}${q.choices?.length?`<div class="qotd-choices">${q.choices.map((c,i)=>`<div>${String.fromCharCode(65+i)}. ${esc(c)}</div>`).join('')}</div>`:''}<div class="qotd-stages">${steps}</div><p class="qotd-prompt">${prompts[qotdStage]}</p>${qotdStage===3?`<div class="qotd-answer"><strong>Answer: ${esc(q.answer||'Discuss as a class')}</strong><p>${esc(q.explanation)}</p></div>`:''}<div class="qotd-actions"><button type="button" id="qotd-next">${qotdStage===3?'Restart':'Next stage'}</button>${link(q.sourceUrl,'CodeHS source')}</div></div>`;
    $('activity-panel').querySelectorAll('[data-qotd-stage]').forEach(b=>b.onclick=()=>{qotdStage=Number(b.dataset.qotdStage);renderQotd(q);});
    $('qotd-next').onclick=()=>{qotdStage=(qotdStage+1)%4;renderQotd(q);};
  }
  function renderContent(){
    $('deeper').hidden=true;
    renderLearningTarget();
    if(!data){$('activity-panel').innerHTML='<div class="empty"><div class="eyebrow">WELCOME</div><h1>Your classroom, at a glance.</h1><p>Open Instructor to connect the content feed, or preview the dashboard with sample content.</p></div>';return;}
    if(qotdDate!==data.date){qotdStage=0;qotdDate=data.date;}
    const s=data[tab];
    if(!data.instructionalDay){$('activity-panel').innerHTML='<div class="empty"><div class="eyebrow">CLASS CALENDAR</div><h1>No class scheduled</h1><p>No activity is scheduled for this date.</p></div>';return;}
    if(tab==='focus'){renderFocus();return;}
    if(tab==='starter'){
      const qotdUrl='https://codehs.com/qotd/python/'+data.date+'/';
      if(data.qotd){renderQotd({...data.qotd,sourceUrl:data.qotd.sourceUrl||qotdUrl});return;}
      $('activity-panel').innerHTML=`<div class="qotd qotd-embed"><div class="eyebrow">DAILY STARTER · CODEHS PYTHON</div><h1>Today's Question of the Day</h1><p class="qotd-prompt">THINK: Predict independently. PAIR: Explain your reasoning. SHARE: Show your whiteboard.</p><div class="qotd-frame-wrap"><iframe class="qotd-frame" title="CodeHS Python Question of the Day" src="${esc(qotdUrl)}" loading="eager" referrerpolicy="strict-origin-when-cross-origin"></iframe></div><div class="qotd-actions">${link(qotdUrl,'Open CodeHS in a separate tab')}<span class="muted">If CodeHS blocks embedding, use Open CodeHS.</span></div></div>`;
      return;
    }
    if(!s){$('activity-panel').innerHTML=`<div class="empty"><h1>${tab==='brain'?'Brain Break':tab==='exit'?'Exit Ticket':'Daily Starter'}</h1><p>No ${tab==='brain'?'brain break':tab==='exit'?'exit ticket':'starter'} is scheduled for this date.</p></div>`;return;}
    if(tab==='starter'){
      $('activity-panel').innerHTML=`<span class="chip">${esc(s.csFocus||'Computer Science')}</span><div class="eyebrow">${esc(s.lens||'DAILY STARTER')}</div><h1>${esc(s.techIcon||s.topic||'Let’s think together')}</h1>${s.iconRole?`<p class="context">${esc(s.iconRole)}</p>`:''}${s.iconContribution?`<p class="context">${esc(s.iconContribution)}</p>`:''}<div class="prompt">${esc(s.prompt)}</div><div class="context">${esc(s.context||'')}</div><div class="routine"><span>01 THINK</span><span>02 SHARE</span><span>03 BUILD</span></div><div id="deeper-content" class="deeper-content" hidden>${esc(s.goDeeper||'')}</div>`;
      $('deeper').hidden=!s.goDeeper;$('deeper').textContent='Go deeper';
    }else if(tab==='brain'){
      const category=String(s.category||'Creative'),theme=/movement/i.test(category)?'movement':/social|teamwork/i.test(category)?'social':/unplugged|CS/i.test(category)?'cs':'creative';
      const instructions=String(s.instructions||'').split(/(?<=[.!?])\s+/).filter(Boolean);
      $('activity-panel').innerHTML=`<div class="arcade-mission arcade-${theme}"><div class="arcade-top"><span class="arcade-category">${esc(category)}</span><span>⚡ BRAIN BREAK LIVE</span></div><div class="arcade-icon" aria-hidden="true">${({movement:'↗',social:'✦',cs:'⌘',creative:'★'})[theme]}</div><h1>${esc(s.title||'Brain Break')}</h1><div class="arcade-label">YOUR MISSION</div><ol class="arcade-steps">${instructions.map(step=>`<li>${esc(step)}</li>`).join('')}</ol><div class="arcade-timing"><span>CHALLENGE TIME</span><strong id="arcade-clock">--:--</strong></div><div class="arcade-track"><div id="arcade-progress"></div></div><p class="arcade-return" id="arcade-return" hidden>${esc(s.returnCue||'Return to your workstation ready to learn.')}</p>${s.alternative?`<details class="arcade-alternative"><summary>Alternative way to participate</summary><p>${esc(s.alternative)}</p></details>`:''}${link(s.resourceUrl,'Open activity')}</div>`;
      updateArcade();
    }else{
      $('activity-panel').innerHTML=`<div class="eyebrow">REFLECT & CONNECT</div><h1>${esc(s.title||'Exit Ticket')}</h1><div class="prompt">${esc(s.prompt)}</div>${s.instructions?`<p class="context">${esc(s.instructions)}</p>`:''}${link(s.responseUrl,'Open response form')}`;
    }
  }
  function shortDate(date,options={month:'short',day:'numeric'}){return new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US',{...options,timeZone:'UTC'});}
  function renderCourses(){
    const phase=data?GCI.scheduled(new Date(),data):null;
    const active=phase?.session;
    const activeCourses=GCI.sessionCourses(active);
    const visibleCourses=showAllCourses?GCI.courses:activeCourses;
    const visible=visibleCourses.length>0;
    document.querySelector('.deadlines').hidden=!visible;
    updateRightColumn();
    $('current-session').hidden=!showAllCourses;
    $('expand-courses').setAttribute('aria-pressed',String(showAllCourses));
    if(active!==lastSession&&!showAllCourses){
      openCourses.clear();
      activeCourses.forEach(name=>openCourses.set(name,true));
    }
    lastSession=active;
    if(!data){$('courses').innerHTML=visibleCourses.map(name=>`<details class="course" open><summary>${esc(name)}</summary><div class="course-body"><p class="none-due">Connect Classroom to load deadlines.</p></div></details>`).join('');return;}
    const today=GCI.localParts(new Date(),data.timezone).date;
    $('week-label').textContent='Next 14 days';
    $('due-title').textContent='Upcoming Due Dates';
    $('courses').innerHTML=visibleCourses.map(name=>{
      const course=data.courses.find(c=>c.name===name)||{name,status:'unconfigured',assignments:[]};
      const assignments=(course.assignments||[]).filter(a=>a.dueDate||a.dueAt)
        .map(a=>({...a,displayDate:a.dueDate||GCI.localParts(new Date(a.dueAt),data.timezone).date}))
        .sort((a,b)=>a.displayDate.localeCompare(b.displayDate)||a.title.localeCompare(b.title));
      const endDate=new Date(today+'T12:00:00Z');endDate.setUTCDate(endDate.getUTCDate()+14);
      const end=endDate.toISOString().slice(0,10);
      const upcoming=assignments.filter(a=>a.displayDate>=today&&a.displayDate<end);
      const overdue=[];
      const renderItems=items=>items.map(a=>`<div class="assignment"><div class="assignment-heading"><span class="assignment-title">${GCI.safeUrl(a.url)?link(a.url,a.title):esc(a.title)}</span>${GCI.submissionBadge(a.submissions)}</div><time datetime="${esc(a.displayDate)}">${shortDate(a.displayDate,{month:'short',day:'numeric',year:'numeric'})}</time></div>`).join('');
      const renderGroups=items=>[...new Set(items.map(a=>a.displayDate))].map(date=>`<section class="day-group"><div class="day-heading">${shortDate(date,{weekday:'short',month:'short',day:'numeric'})}</div>${renderItems(items.filter(a=>a.displayDate===date))}</section>`).join('');
      let body='';
      if(course.status!=='ready')body=`<p class="none-due">${course.status==='error'?'Deadlines unavailable. Try Refresh.':'Classroom connection not configured.'}</p>`;
      else body=(upcoming.length?renderGroups(upcoming):'<p class="none-due">No upcoming dated assignments.</p>')
        +(overdue.length?`<details class="overdue-assignments"><summary>Past due dates (${overdue.length})</summary>${renderGroups(overdue)}</details>`:'');
      return `<details class="course ${activeCourses.includes(name)?'active':''}" data-course="${esc(name)}" ${openCourses.get(name)?'open':''}><summary>${esc(name)}<span class="course-count">${course.status==='ready'?upcoming.length:'—'}</span></summary><div class="course-body">${body}</div></details>`;
    }).join('');
    document.querySelectorAll('[data-course]').forEach(el=>el.addEventListener('toggle',()=>openCourses.set(el.dataset.course,el.open)));
  }
  function updateRightColumn(){
    const hidden=document.querySelector('.deadlines').hidden&&$('reminders').hidden&&$('school-notices').hidden;
    document.querySelector('.right-column').hidden=hidden;
    document.querySelector('.layout').classList.toggle('no-session',hidden);
  }
  function renderReminders(){
    const el=$('reminders'),items=Array.isArray(data?.reminders)?data.reminders:[];
    el.hidden=!items.length;
    el.innerHTML=items.length?`<h3 id="reminders-title">Announcements</h3><ul>${items.map(item=>`<li><strong>${esc(item.title)}</strong>${item.message?`<p>${esc(item.message)}</p>`:''}</li>`).join('')}</ul>`:'';
    updateRightColumn();
  }
  function renderSchoolNotices(){
    const el=$('school-notices'),calendar=data?.schoolCalendar;
    if(!calendar){el.hidden=true;updateRightColumn();return;}
    const fullLink='<a href="No_School_Viewer.html" target="_blank" rel="noopener noreferrer">Full calendar ↗</a>';
    if(calendar.status!=='ready'){el.hidden=false;el.innerHTML='<h3 class="notice-heading">School calendar unavailable</h3>'+fullLink;updateRightColumn();return;}
    const events=calendar.events||[];
    if(!events.length){el.hidden=true;el.dataset.date='';updateRightColumn();return;}
    const isNoSchool=item=>/\bno[\s-]+(?:school|students|regular school)\b|\bschools?\s+(?:are\s+)?closed\b/i.test(String(item.event));
    const noSchool=events.filter(isNoSchool),others=events.filter(item=>!isNoSchool(item));
    const othersOpen=el.dataset.date===data.date&&el.querySelector('details')?.open;
    const list=items=>`<ul>${items.map(item=>`<li><strong>${esc(item.school)}</strong><span class="school-event">${esc(item.event)}</span></li>`).join('')}</ul>`;
    el.hidden=false;
    el.dataset.date=data.date;
    el.innerHTML=`<h3 class="notice-heading">${noSchool.length?'No school':'School notices'} · ${shortDate(data.date)}</h3>${noSchool.length?list(noSchool):''}${others.length?`<details${othersOpen?' open':''}><summary>Other notices (${others.length})</summary>${list(others)}</details>`:''}${fullLink}`;
    updateRightColumn();
  }
  function announce(phase){
    if(!phase||!data)return;
    const p=data.phases[phase.index];
    $('announcement-title').textContent=p.name;$('announcement-message').textContent=p.message||'';$('announcement-icon').textContent=p.icon||'✦';$('announcement-session').textContent=phase.session;
    $('timer-phase-notice').textContent=`${phase.session} · ${p.name}: ${p.message||''}`;
    $('timer-phase-notice').hidden=!$('countdown-dialog').open;
    if(timerLocation&&$('countdown-dialog').open)positionCountdown(timerLocation.x,timerLocation.y);
    $('announcement').hidden=false;clearTimeout(announcementTimer);announcementTimer=setTimeout(()=>{$('announcement').hidden=true;$('timer-phase-notice').hidden=true;},6000);
    playChime();
  }
  function playChime(){
    if(sound&&soundContext){try{const oscillator=soundContext.createOscillator(),gain=soundContext.createGain();oscillator.connect(gain);gain.connect(soundContext.destination);oscillator.frequency.value=660;gain.gain.setValueAtTime(.0001,soundContext.currentTime);gain.gain.exponentialRampToValueAtTime(.10,soundContext.currentTime+.03);gain.gain.exponentialRampToValueAtTime(.0001,soundContext.currentTime+.65);oscillator.start();oscillator.stop(soundContext.currentTime+.7);}catch{}}
  }
  function updateArcade(){
    if(tab!=='brain'||!data?.brain)return;
    const phase=currentPhase(),isBreak=phase?.index===2,seconds=Math.max(0,Math.round(phase?.remaining||0));
    const duration=Math.max(1,Number(data.brain.duration)||5)*60;
    const elapsed=isBreak?Math.max(0,(data.phases?.[2]?.minutes||10)*60-seconds):0;
    const left=isBreak?Math.max(0,duration-elapsed):duration;
    const clock=$('arcade-clock'),progress=$('arcade-progress'),cue=$('arcade-return');
    if(clock)clock.textContent=String(Math.floor(left/60)).padStart(2,'0')+':'+String(left%60).padStart(2,'0');
    if(progress)progress.style.width=(100*left/duration)+'%';
    if(cue)cue.hidden=left>0;
  }
  function tick(){
    const now=new Date(),tz=data?.timezone||'America/Detroit',local=GCI.localParts(now,tz);
    $('clock').textContent=now.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',timeZone:tz});
    const displayedDate=data?.date||local.date;
    $('date-label').textContent=shortDate(displayedDate,{weekday:'long',year:'numeric',month:'long',day:'numeric'});
    if(document.activeElement!==$('date-picker'))$('date-picker').value=displayedDate;
    $('date-label').title=displayedDate===local.date?'Today':`Viewing ${displayedDate}; class timing still follows today`;
    const phase=currentPhase(now),key=phase?.key||'outside';
    if(key!==lastAutoPhaseKey){
      lastAutoPhaseKey=key;
      if(phase&&data?.date===local.date&&manualTabPhaseKey!==key){
        const desired=['starter','focus','brain','focus','exit'][phase.index];
        if(desired&&tab!==desired)selectTab(desired);
      }
    }
    updateArcade();
    if(lastKey!==null&&lastKey!==key&&phase)announce(phase);
    const sessionChanged=lastSession!==(data?GCI.scheduled(now,data)?.session:undefined);
    if(lastKey!==key||sessionChanged){lastKey=key;renderCourses();renderLearningTarget();if(tab==='focus'&&sessionChanged)renderContent();}
    $('session-label').textContent=phase?.session||(data&&!(data.todayInstructionalDay??data.instructionalDay)?'No class today':'Outside class');
    $('phases').innerHTML=(data?.phases||GCI.phases).map((p,i)=>`<li class="${phase?.index===i?'current':phase&&phase.index>i?'past':''}" ${phase?.index===i?'aria-current="step"':''}><span class="phase-number">${i+1}</span>${esc(p.name)}</li>`).join('');
    $('phase-remaining').textContent=phase?`${Math.floor(phase.remaining/60).toString().padStart(2,'0')}:${(phase.remaining%60).toString().padStart(2,'0')}`:'—';
    $('phase-mode').textContent=manual?'Manual · Resume to rejoin schedule':'Scheduled transitions';
    if(data&&(data.today||data.date)!==local.date&&!inflight&&Date.now()-lastAttempt>60000)refresh();
  }
  function apply(next){
    data=GCI.validate(next);$('app-title').textContent=data.title||'Classroom Dashboard';$('content-date').textContent=shortDate(data.date);
    const selectedSession=$('session-choice').value,selectedPhase=$('phase-choice').value;
    $('session-choice').innerHTML=data.sessions.map(s=>`<option>${esc(s.name)}</option>`).join('');
    $('session-choice').value=selectedSession||currentPhase()?.session||data.sessions[0]?.name||'';
    $('phase-choice').innerHTML=data.phases.map((p,i)=>`<option value="${i}">${esc(p.name)}${i===1?' · first work block':i===3?' · second work block':''}</option>`).join('');
    $('phase-choice').value=selectedPhase||'0';
    renderContent();renderCourses();renderReminders();renderSchoolNotices();tick();
  }
  function refresh(){
    if(inflight)return;
    if(preview){apply(GCI.sample(new Date(),selectedDate));status('PREVIEW · Sample activities and fictional assignments. Not connected to live data.','preview');return;}
    if(!feedUrl){status('Not connected · Open Instructor to connect your spreadsheet feed.');renderContent();renderCourses();return;}
    inflight=true;lastAttempt=Date.now();$('refresh').disabled=true;setDateBusy(true);status('Refreshing class content…');
    const token=++generation,requestDate=selectedDate,script=document.createElement('script');let finished=false;
    function cleanup(){finished=true;clearTimeout(timeout);script.remove();inflight=false;$('refresh').disabled=false;setDateBusy(false);}
    function fail(message){if(finished)return;cleanup();const today=GCI.localParts(new Date(),data?.timezone||'America/Detroit').date;selectedDate=data?.date&&data.date!==today?data.date:'';$('date-picker').value=data?.date||today;tick();status(typeof message==='string'?message:data?'Connection unavailable · Showing previously loaded content.':'Could not connect · Check the feed URL and deployment access in Instructor.','error');}
    const timeout=setTimeout(fail,20000);
    window.gciDashboardFeed=payload=>{
      if(finished||token!==generation)return;
      if(payload.requestId!==String(token))return;
      if(requestDate&&payload.date&&payload.date!==requestDate){fail('Update the Apps Script feed for date navigation. Showing the previously loaded date.');return;}
      try{if(payload.error)throw new Error(payload.error);apply(payload);cleanup();const errors=data.courses.some(c=>c.status==='error');status(errors?'Content connected · Some Classroom deadlines are unavailable.':`Connected · Updated ${new Date(data.generatedAt).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',timeZone:data.timezone})}`,errors?'error':'');}catch{fail();}
    };
    script.onerror=fail;script.src=`${feedUrl}?callback=gciDashboardFeed&requestId=${token}${requestDate?'&date='+encodeURIComponent(requestDate):''}&t=${Date.now()}`;document.head.appendChild(script);
  }
  function setDateBusy(busy){['date-previous','date-next','date-today','date-picker'].forEach(id=>$(id).disabled=busy);}
  function chooseDate(value){if(inflight||!GCI.validDate(value))return;const today=GCI.localParts(new Date(),data?.timezone||'America/Detroit').date;selectedDate=value===today?'':value;refresh();}
  $('date-previous').onclick=()=>chooseDate(GCI.addDays(data?.date||GCI.localParts(new Date()).date,-1));
  $('date-next').onclick=()=>chooseDate(GCI.addDays(data?.date||GCI.localParts(new Date()).date,1));
  $('date-today').onclick=()=>chooseDate(GCI.localParts(new Date(),data?.timezone||'America/Detroit').date);
  $('date-picker').onchange=()=>chooseDate($('date-picker').value);
  $('settings-open').onclick=()=>{$('feed-url').value=feedUrl;$('sound').checked=sound;$('settings').showModal();};
  $('save-feed').onclick=()=>{const next=GCI.validFeed($('feed-url').value.trim());if(!next){$('settings-message').textContent='Enter a Google Apps Script /exec deployment URL.';return;}if(inflight){$('settings-message').textContent='Wait for the current refresh to finish.';return;}feedUrl=next;preview=false;data=null;manual=null;lastKey=null;store.set('gci.dashboard.feed',next);$('settings-message').textContent='Connection saved on this browser.';refresh();};
  $('demo').onclick=()=>{if(inflight)return;preview=true;manual=null;lastKey=null;refresh();$('settings').close();};
  $('refresh').onclick=refresh;
  $('timer-open').onclick=()=>{renderCountdown();openCountdown();};
  $('timer-close').onclick=()=>$('countdown-dialog').close();
  $('countdown-dialog').onclose=()=>{stopTimerDrag();$('timer-open').setAttribute('aria-expanded','false');$('timer-phase-notice').hidden=true;};
  $('timer-center').onclick=centerCountdown;
  $('timer-drag-handle').onpointerdown=event=>{
    if(event.button!==0||event.isPrimary===false)return;
    const rect=$('countdown-dialog').getBoundingClientRect();
    timerDrag={id:event.pointerId,x:event.clientX,y:event.clientY,left:rect.left,top:rect.top};
    event.preventDefault();event.currentTarget.focus();event.currentTarget.setPointerCapture(event.pointerId);event.currentTarget.classList.add('dragging');
  };
  $('timer-drag-handle').onpointermove=event=>{if(timerDrag?.id===event.pointerId)positionCountdown(timerDrag.left+event.clientX-timerDrag.x,timerDrag.top+event.clientY-timerDrag.y);};
  ['pointerup','pointercancel','lostpointercapture'].forEach(name=>$('timer-drag-handle').addEventListener(name,stopTimerDrag));
  $('timer-drag-handle').onkeydown=event=>{
    if(event.key==='Home'){event.preventDefault();centerCountdown();return;}
    const directions={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]},direction=directions[event.key];
    if(!direction)return;event.preventDefault();
    const rect=$('countdown-dialog').getBoundingClientRect(),step=event.shiftKey?30:10;
    positionCountdown(rect.left+direction[0]*step,rect.top+direction[1]*step);
  };
  window.addEventListener('resize',()=>{if(timerLocation&&$('countdown-dialog').open)positionCountdown(timerLocation.x,timerLocation.y);});
  document.querySelectorAll('[data-add-seconds]').forEach(button=>button.onclick=()=>{
    const seconds=Number(button.dataset.addSeconds);
    if(countdown.snapshot().remaining+seconds>10800)return;
    countdown.add(seconds);timerNotified=false;renderCountdown();
  });
  $('timer-minutes').onchange=()=>configureCountdown(Number($('timer-minutes').value));
  document.querySelectorAll('[data-minutes]').forEach(button=>button.onclick=()=>configureCountdown(Number(button.dataset.minutes)));
  $('timer-toggle').onclick=()=>{if(!$('timer-minutes').checkValidity()){$('timer-minutes').reportValidity();return;}if(countdown.snapshot().running)countdown.pause();else{countdown.start();timerNotified=false;}renderCountdown();};
  $('timer-reset').onclick=()=>{countdown.reset();timerNotified=false;renderCountdown();};
  $('target-group').onchange=()=>{targetGroup=$('target-group').value;if(tab==='focus')renderContent();else renderLearningTarget();};
  $('activity-panel').addEventListener('click',event=>{
    const button=event.target.closest?.('[data-focus-panel]');
    if(!button||!['task','criteria','hint','help'].includes(button.dataset.focusPanel))return;
    focusPanel=button.dataset.focusPanel;renderContent();
    $('activity-panel').querySelector(`[data-focus-panel="${focusPanel}"]`)?.focus();
  });
  $('expand-courses').onclick=()=>{showAllCourses=true;GCI.courses.forEach(name=>openCourses.set(name,true));renderCourses();$('settings').close();};
  $('current-session').onclick=()=>{showAllCourses=false;lastSession=null;renderCourses();};
  $('set-phase').onclick=()=>{
    if(!data)return;const now=new Date(),scheduled=GCI.scheduled(now,data),session=$('session-choice').value,index=Number($('phase-choice').value),duration=data.phases[index].minutes*60000;
    manual={session,index,key:`manual:${Date.now()}`,ends:now.getTime()+duration,expires:scheduled?.session===session?scheduled.sessionEnd:now.getTime()+duration};
    tick();$('settings').close();
  };
  $('repeat-phase').onclick=()=>{announce(currentPhase());$('settings').close();};
  $('auto-phase').onclick=()=>{manual=null;lastKey=null;tick();$('settings').close();};
  $('sound').onchange=async()=>{sound=$('sound').checked;store.set('gci.dashboard.sound',String(sound));if(sound){try{soundContext ||= new (window.AudioContext||window.webkitAudioContext)();await soundContext.resume();}catch{sound=false;$('sound').checked=false;store.set('gci.dashboard.sound','false');}}};
  document.addEventListener('pointerdown',()=>{if(sound&&!soundContext){try{soundContext=new (window.AudioContext||window.webkitAudioContext)();soundContext.resume().catch(()=>{});}catch{}}});
  $('dismiss-announcement').onclick=()=>{$('announcement').hidden=true;$('timer-phase-notice').hidden=true;clearTimeout(announcementTimer);};
  document.addEventListener('keydown',event=>{if(event.key==='Escape'){const announcementVisible=!$('announcement').hidden;$('announcement').hidden=true;$('timer-phase-notice').hidden=true;clearTimeout(announcementTimer);if(!announcementVisible&&$('countdown-dialog').open&&!$('settings').open)$('countdown-dialog').close();}});
  $('deeper').onclick=()=>{const content=$('deeper-content');if(content){content.hidden=!content.hidden;$('deeper').textContent=content.hidden?'Go deeper':'Hide deeper question';}};
  $('fullscreen').onclick=async()=>{try{if(!document.fullscreenElement)await document.documentElement.requestFullscreen();else await document.exitFullscreen();}catch{status('Use your browser’s full-screen command if full screen is blocked.','error');}};
  const tabs=[...document.querySelectorAll('[data-tab]')];
  tabs.forEach((button,i)=>{button.onclick=()=>{manualTabPhaseKey=currentPhase()?.key||'outside';selectTab(button.dataset.tab);};button.onkeydown=event=>{let index;if(event.key==='ArrowRight')index=(i+1)%tabs.length;else if(event.key==='ArrowLeft')index=(i+tabs.length-1)%tabs.length;else if(event.key==='Home')index=0;else if(event.key==='End')index=tabs.length-1;else return;event.preventDefault();tabs[index].focus();manualTabPhaseKey=currentPhase()?.key||'outside';selectTab(tabs[index].dataset.tab);};});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){tick();renderCountdown();if(!inflight)refresh();}});
  feedUrl=GCI.validFeed(store.get('gci.dashboard.feed'))||defaultFeedUrl;preview=new URLSearchParams(location.search).get('preview')==='1';
  refresh();tick();renderCountdown();setInterval(tick,1000);setInterval(renderCountdown,250);setInterval(refresh,60000);
}
