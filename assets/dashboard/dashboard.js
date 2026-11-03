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
  function validate(data){
    if(!data||data.version!==1||!/^\d{4}-\d{2}-\d{2}$/.test(data.date)||!Array.isArray(data.courses)||!Array.isArray(data.sessions)||!Array.isArray(data.phases)||data.phases.length!==5)throw new Error('The feed is not a dashboard feed.');
    new Intl.DateTimeFormat('en',{timeZone:data.timezone}).format();
    if(data.phases.some(p=>!Number.isFinite(p.minutes)||p.minutes<=0)||data.sessions.some(s=>!/^\d{2}:\d{2}$/.test(s.start)||!/^\d{2}:\d{2}$/.test(s.end)||minuteOf(s.start)>=minuteOf(s.end)))throw new Error('Check the class schedule in the feed.');
    return data;
  }
  function sample(now=new Date(),selectedDate=''){
    const today=localParts(now).date,date=selectedDate||today,week=weekDates(date);
    return {version:1,date,today,todayInstructionalDay:true,timezone:'America/Detroit',title:'CS Daily Starters',generatedAt:now.toISOString(),instructionalDay:true,sessions,phases,
      starter:{lens:'Design Lab',topic:'Make the next step clear',csFocus:'Conditionals',prompt:'A game needs to explain why a player cannot open a locked door. How could the message help the player decide what to try next?',context:'Think for a moment. Discuss at your table. Be ready to explain one design choice.',goDeeper:'How should the message change when the player has the key but needs more energy?'},
      brain:{title:'Look up & reset',instructions:'Look away from the screen. Stretch gently if comfortable, then share one small win with your table.',alternative:'Stay seated, rest, or choose a comfortable movement.',returnCue:'Choose your next step before returning to your work.',duration:10},
      exit:{title:'Make your thinking visible',prompt:'Describe one conditional you tested today. What input did you try, what happened, and what would you test next?'},
      courses:courses.map((name,i)=>({name,status:'ready',assignments:i<3?[{title:['Conditionals practice','Test a decision','Explain your solution'][i],dueAt:`${week[i+1]}T20:00:00.000Z`,url:'https://classroom.google.com/',submissions:{submitted:[18,21,24][i],total:24}}]:[]}))};
  }
  return {courses,phases,sessions,sessionCourses,localParts,weekDates,addDays,validDate,scheduled,safeUrl,validFeed,escape,submissionBadge,validate,sample};
})();
if(typeof module!=='undefined')module.exports=GCI;
if(typeof document!=='undefined'){
  const $=id=>document.getElementById(id),esc=GCI.escape;
  const defaultFeedUrl='https://script.google.com/macros/s/AKfycbw4Rj6Xqlz61dI8N8jg9v8ehWSgkbLsCLF1ZSUZHk1RzSGf_s5ZDutLj4KfqQYLzQ/exec';
  let data=null,tab='starter',preview=false,feedUrl='',inflight=false,lastKey=null,manual=null,lastSession=null,announcementTimer=null,soundContext=null,generation=0,lastAttempt=0,selectedDate='',showAllCourses=false;
  const openCourses=new Map();
  const store={get(key){try{return localStorage.getItem(key)||'';}catch{return '';}},set(key,value){try{localStorage.setItem(key,value);}catch{}}};
  let sound=store.get('gci.dashboard.sound')==='true';
  function status(text,kind=''){$('connection').textContent=text;$('connection').className=`connection ${kind}`;}
  function currentPhase(now=new Date()){
    if(manual&&now.getTime()>=manual.expires){manual=null;lastKey=null;}
    if(manual)return {...manual,remaining:Math.max(0,Math.ceil((manual.ends-now.getTime())/1000))};
    return data?GCI.scheduled(now,data):null;
  }
  function selectTab(next){tab=next;document.querySelectorAll('[data-tab]').forEach(b=>{const selected=b.dataset.tab===tab;b.setAttribute('aria-selected',String(selected));b.tabIndex=selected?0:-1;});$('activity-panel').setAttribute('aria-labelledby',`tab-${tab}`);renderContent();}
  function link(url,label){const safe=GCI.safeUrl(url);return safe?`<a href="${esc(safe)}" target="_blank" rel="noopener noreferrer">${esc(label)} ↗</a>`:'';}
  function renderContent(){
    $('deeper').hidden=true;
    if(!data){$('activity-panel').innerHTML='<div class="empty"><div class="eyebrow">WELCOME</div><h1>Your classroom, at a glance.</h1><p>Open Instructor to connect the content feed, or preview the dashboard with sample content.</p></div>';return;}
    const s=data[tab];
    if(!data.instructionalDay){$('activity-panel').innerHTML='<div class="empty"><div class="eyebrow">CLASS CALENDAR</div><h1>No class scheduled</h1><p>No activity is scheduled for this date.</p></div>';return;}
    if(!s){$('activity-panel').innerHTML=`<div class="empty"><h1>${tab==='brain'?'Brain Break':tab==='exit'?'Exit Ticket':'Daily Starter'}</h1><p>No ${tab==='brain'?'brain break':tab==='exit'?'exit ticket':'starter'} is scheduled for this date.</p></div>`;return;}
    if(tab==='starter'){
      $('activity-panel').innerHTML=`<span class="chip">${esc(s.csFocus||'Computer Science')}</span><div class="eyebrow">${esc(s.lens||'DAILY STARTER')}</div><h1>${esc(s.techIcon||s.topic||'Let’s think together')}</h1>${s.iconRole?`<p class="context">${esc(s.iconRole)}</p>`:''}${s.iconContribution?`<p class="context">${esc(s.iconContribution)}</p>`:''}<div class="prompt">${esc(s.prompt)}</div><div class="context">${esc(s.context||'')}</div><div class="routine"><span>01 THINK</span><span>02 SHARE</span><span>03 BUILD</span></div><div id="deeper-content" class="deeper-content" hidden>${esc(s.goDeeper||'')}</div>`;
      $('deeper').hidden=!s.goDeeper;$('deeper').textContent='Go deeper';
    }else if(tab==='brain'){
      $('activity-panel').innerHTML=`<span class="chip">${esc(s.duration||10)} minutes</span><div class="eyebrow">RESET & RECHARGE</div><h1>${esc(s.title||'Brain Break')}</h1><div class="prompt">${esc(s.instructions)}</div>${s.alternative?`<p class="context">Your choice: ${esc(s.alternative)}</p>`:''}${s.returnCue?`<p class="context">${esc(s.returnCue)}</p>`:''}${link(s.resourceUrl,'Open activity')}`;
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
    document.querySelector('.layout').classList.toggle('no-session',!visible);
    $('current-session').hidden=!showAllCourses;
    $('expand-courses').setAttribute('aria-pressed',String(showAllCourses));
    if(active!==lastSession&&!showAllCourses){
      openCourses.clear();
      activeCourses.forEach(name=>openCourses.set(name,true));
    }
    lastSession=active;
    if(!data){$('courses').innerHTML=visibleCourses.map(name=>`<details class="course" open><summary>${esc(name)}</summary><div class="course-body"><p class="none-due">Connect Classroom to load deadlines.</p></div></details>`).join('');return;}
    const today=GCI.localParts(new Date(),data.timezone).date,viewDate=selectedDate||today,week=GCI.weekDates(viewDate);
    $('week-label').textContent=`${shortDate(week[0])} – ${shortDate(week[6])}`;
    $('due-title').textContent=week[0]===GCI.weekDates(today)[0]?'Due This Week':'Due That Week';
    $('courses').innerHTML=visibleCourses.map(name=>{
      const course=data.courses.find(c=>c.name===name)||{name,status:'unconfigured',assignments:[]};
      const assignments=(course.assignments||[]).filter(a=>a.dueAt&&week.includes(GCI.localParts(new Date(a.dueAt),data.timezone).date)).sort((a,b)=>new Date(a.dueAt)-new Date(b.dueAt));
      const days=week.filter(date=>assignments.some(a=>GCI.localParts(new Date(a.dueAt),data.timezone).date===date));
      let body='';
      const staleWeek=GCI.weekDates(data.date)[0]!==week[0];
      if(staleWeek)body='<p class="none-due">This week’s deadlines are unavailable until the connection refreshes.</p>';
      else if(course.status!=='ready')body=`<p class="none-due">${course.status==='error'?'Deadlines unavailable. Try Refresh.':'Classroom connection not configured.'}</p>`;
      else body=days.map(date=>{
        const items=assignments.filter(a=>GCI.localParts(new Date(a.dueAt),data.timezone).date===date);
        return `<section class="day-group ${date===today?'today':date<today?'past':''}"><div class="day-heading">${shortDate(date,{weekday:'long'})}${date===today?' · Today':''}</div>${items.map(a=>`<div class="assignment"><div class="assignment-heading"><span class="assignment-title">${GCI.safeUrl(a.url)?link(a.url,a.title):esc(a.title)}</span>${GCI.submissionBadge(a.submissions)}</div><time datetime="${esc(a.dueAt)}">${new Date(a.dueAt).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',timeZone:data.timezone})}</time></div>`).join('')}</section>`;
      }).join('')||'<p class="none-due">Nothing due this week.</p>';
      return `<details class="course ${activeCourses.includes(name)?'active':''}" data-course="${esc(name)}" ${openCourses.get(name)?'open':''}><summary>${esc(name)}<span class="course-count">${course.status==='ready'&&!staleWeek?assignments.length:'—'}</span></summary><div class="course-body">${body}</div></details>`;
    }).join('');
    document.querySelectorAll('[data-course]').forEach(el=>el.addEventListener('toggle',()=>openCourses.set(el.dataset.course,el.open)));
  }
  function renderSchoolNotices(){
    const el=$('school-notices'),calendar=data?.schoolCalendar;
    if(!calendar){el.hidden=true;return;}
    const fullLink='<a href="No_School_Viewer.html" target="_blank" rel="noopener noreferrer">Full calendar ↗</a>';
    if(calendar.status!=='ready'){el.hidden=false;el.innerHTML='<span class="notice-heading">School calendar unavailable</span>'+fullLink;return;}
    const events=calendar.events||[];
    if(!events.length){el.hidden=true;return;}
    const gci=events.filter(item=>['gci','genesee career institute','all schools'].includes(String(item.school).toLowerCase()));
    el.hidden=false;
    el.innerHTML=`<span class="notice-heading">School notices · ${shortDate(data.date)}</span>${gci.map(item=>`<span>${esc(item.school)}: ${esc(item.event)}</span>`).join('')}<details><summary>${events.length} school notice${events.length===1?'':'s'} · View affected schools</summary><ul>${events.map(item=>`<li><strong>${esc(item.school)}</strong> — ${esc(item.event)}</li>`).join('')}</ul></details>${fullLink}`;
  }
  function announce(phase){
    if(!phase||!data)return;
    const p=data.phases[phase.index];
    $('announcement-title').textContent=p.name;$('announcement-message').textContent=p.message||'';$('announcement-icon').textContent=p.icon||'✦';$('announcement-session').textContent=phase.session;
    $('announcement').hidden=false;clearTimeout(announcementTimer);announcementTimer=setTimeout(()=>{$('announcement').hidden=true;},6000);
    if(sound&&soundContext){try{const oscillator=soundContext.createOscillator(),gain=soundContext.createGain();oscillator.connect(gain);gain.connect(soundContext.destination);oscillator.frequency.value=660;gain.gain.setValueAtTime(.0001,soundContext.currentTime);gain.gain.exponentialRampToValueAtTime(.10,soundContext.currentTime+.03);gain.gain.exponentialRampToValueAtTime(.0001,soundContext.currentTime+.65);oscillator.start();oscillator.stop(soundContext.currentTime+.7);}catch{}}
  }
  function tick(){
    const now=new Date(),tz=data?.timezone||'America/Detroit',local=GCI.localParts(now,tz);
    $('clock').textContent=now.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',timeZone:tz});
    const displayedDate=data?.date||local.date;
    $('date-label').textContent=shortDate(displayedDate,{weekday:'long',year:'numeric',month:'long',day:'numeric'});
    if(document.activeElement!==$('date-picker'))$('date-picker').value=displayedDate;
    $('date-label').title=displayedDate===local.date?'Today':`Viewing ${displayedDate}; class timing still follows today`;
    const phase=currentPhase(now),key=phase?.key||'outside';
    if(lastKey!==null&&lastKey!==key&&phase)announce(phase);
    if(lastKey!==key||lastSession!==(data?GCI.scheduled(now,data)?.session:undefined)){lastKey=key;renderCourses();}
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
    renderContent();renderCourses();renderSchoolNotices();tick();
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
  $('dismiss-announcement').onclick=()=>{$('announcement').hidden=true;clearTimeout(announcementTimer);};
  document.addEventListener('keydown',event=>{if(event.key==='Escape'){$('announcement').hidden=true;clearTimeout(announcementTimer);}});
  $('deeper').onclick=()=>{const content=$('deeper-content');if(content){content.hidden=!content.hidden;$('deeper').textContent=content.hidden?'Go deeper':'Hide deeper question';}};
  $('fullscreen').onclick=async()=>{try{if(!document.fullscreenElement)await document.documentElement.requestFullscreen();else await document.exitFullscreen();}catch{status('Use your browser’s full-screen command if full screen is blocked.','error');}};
  const tabs=[...document.querySelectorAll('[data-tab]')];
  tabs.forEach((button,i)=>{button.onclick=()=>selectTab(button.dataset.tab);button.onkeydown=event=>{let index;if(event.key==='ArrowRight')index=(i+1)%tabs.length;else if(event.key==='ArrowLeft')index=(i+tabs.length-1)%tabs.length;else if(event.key==='Home')index=0;else if(event.key==='End')index=tabs.length-1;else return;event.preventDefault();tabs[index].focus();selectTab(tabs[index].dataset.tab);};});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){tick();if(!inflight)refresh();}});
  feedUrl=GCI.validFeed(store.get('gci.dashboard.feed'))||defaultFeedUrl;preview=new URLSearchParams(location.search).get('preview')==='1';
  refresh();tick();setInterval(tick,1000);setInterval(refresh,60000);
}
