/* Optional install help and update controls for the Group Generator PWA.
   Browser saves (localStorage) remain untouched by install/update operations. */
(function(){
 'use strict';
 const installButton=document.getElementById('install-app');
 const updateButton=document.getElementById('pwa-update');
 const guide=document.getElementById('install-guide');
 const guideTitle=document.getElementById('install-guide-title');
 const guideIntro=document.getElementById('install-guide-intro');
 const guideSteps=document.getElementById('install-guide-steps');
 const guideClose=document.getElementById('install-guide-close');
 const status=document.getElementById('pwa-status');
 if(!installButton||!updateButton||!guide||!guideSteps)return;
 let deferredPrompt=null,registration=null,applyUpdate=false;
 const standalone=()=>Boolean((window.matchMedia&&window.matchMedia('(display-mode: standalone)').matches)||navigator.standalone===true);
 const iphone=()=>/iPhone|iPad|iPod/.test(navigator.userAgent||'')||
  (navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
 const android=()=>/Android/i.test(navigator.userAgent||'');
 const edge=()=>/Edg\//.test(navigator.userAgent||'');
 const isSecure=()=>location.protocol==='https:'||location.hostname==='localhost'||location.hostname==='127.0.0.1';
 function updateInstallVisibility(){
   installButton.hidden=standalone();
 }
 function displayStatus(message){
   status.hidden=!message;
   status.textContent=message||'';
 }
 function stepsForBrowser(){
   if(iphone())return {
     title:'Add Group Generator on iPhone or iPad',
     intro:'Use Safari to add this site to your Home Screen. It opens like an app.',
     steps:['Open the Group Generator in Safari.','Tap the Share button (square with an up arrow).','Scroll and choose Add to Home Screen.','Enable Open as Web App if shown, then tap Add.']
   };
   if(edge())return {
     title:'Install in Microsoft Edge',
     intro:'Edge can install this tool as a separate classroom app.',
     steps:['Open this page in Microsoft Edge.','Select Settings and more (⋯) → Apps.','Choose Install this site as an app, then confirm.']
   };
   if(android())return {
     title:'Install on an Android device',
     intro:'Chrome or Edge can place the Group Generator on your home screen.',
     steps:['Open this page in Chrome or Edge.','Open the browser menu (⋮).','Choose Install app or Add to Home screen, then confirm.']
   };
   return {
     title:'Install the Group Generator',
     intro:'Use your browser installation menu to open the tool in its own window.',
     steps:['Open this page in Chrome or Edge.','Look for an Install icon in the address bar, or open the browser menu.','Choose Install app or Install this site as an app, then confirm.']
   };
 }
 function showGuide(){
   const content=stepsForBrowser();
   guideTitle.textContent=content.title;guideIntro.textContent=content.intro;
   guideSteps.replaceChildren();
   content.steps.forEach(text=>{
     const item=document.createElement('li');item.textContent=text;guideSteps.appendChild(item);
   });
   if(typeof guide.showModal==='function'&&!guide.open)guide.showModal();
   else if(typeof guide.showModal!=='function'){guide.hidden=false;guide.setAttribute('open','');}
 }
 function closeGuide(){
   if(typeof guide.close==='function'&&guide.open)guide.close();
   else{guide.removeAttribute('open');guide.hidden=true;}
   if(typeof installButton.focus==='function')installButton.focus();
 }
 async function requestInstall(){
   if(standalone()){updateInstallVisibility();return;}
   if(!deferredPrompt){showGuide();return;}
   const event=deferredPrompt;deferredPrompt=null;
   try{
     await event.prompt();
     const choice=await event.userChoice;
     if(choice&&choice.outcome==='accepted'){
       displayStatus('Installing the Group Generator…');
     }else{
       displayStatus('Installation was not completed. You can install it from your browser menu.');
     }
   }catch(error){
     showGuide();
   }
 }
 installButton.addEventListener('click',requestInstall);
 guideClose.addEventListener('click',closeGuide);
 guide.addEventListener('click',event=>{if(event.target===guide)closeGuide();});
 window.addEventListener('beforeinstallprompt',event=>{
   event.preventDefault();deferredPrompt=event;updateInstallVisibility();
 });
 window.addEventListener('appinstalled',()=>{
   deferredPrompt=null;installButton.hidden=true;
   if(guide.open)closeGuide();
   displayStatus('Group Generator installed on this device.');
 });
 function checkConnection(){
   if(navigator.onLine===false){
     displayStatus('Offline mode — saved lists remain in this browser.');
   }else if(status.textContent.startsWith('Offline mode')){
     displayStatus('');
   }
 }
 window.addEventListener('online',checkConnection);
 window.addEventListener('offline',checkConnection);
 function readyUpdate(reg){
   if(reg.waiting&&navigator.serviceWorker.controller){
     updateButton.hidden=false;
   }
 }
 updateButton.addEventListener('click',()=>{
   if(!registration||!registration.waiting)return;
   // Never reload an active classroom arrangement without the teacher's consent.
   if(!window.confirm('Update and reload the Group Generator now? Save or export any unsaved group assignments before continuing. Browser-saved classes and groupings will be kept.'))return;
   applyUpdate=true;updateButton.disabled=true;updateButton.textContent='Updating…';
   registration.waiting.postMessage({type:'SKIP_WAITING'});
 });
 updateInstallVisibility();
 checkConnection();
 if(!('serviceWorker' in navigator)||!isSecure()){
   return;
 }
 navigator.serviceWorker.addEventListener('controllerchange',()=>{
   if(applyUpdate)window.location.reload();
 });
 navigator.serviceWorker.register('./sw.js',{scope:'./'}).then(reg=>{
   registration=reg;
   readyUpdate(reg);
   reg.addEventListener('updatefound',()=>{
     const worker=reg.installing;
     if(!worker)return;
     worker.addEventListener('statechange',()=>{
       if(worker.state==='installed')readyUpdate(reg);
     });
   });
   if(navigator.onLine!==false)reg.update().catch(()=>{});
 }).catch(()=>{
   displayStatus('Offline installation is unavailable in this browser. The online Group Generator still works.');
 });
})();
