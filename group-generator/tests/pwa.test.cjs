// Run: node --test group-generator/tests/pwa.test.cjs
// Verifies installability, local app icons, offline shell, and non-destructive updates.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const zlib=require('node:zlib');
const appPath=path.join(__dirname,'..');
const fromApp=file=>fs.readFileSync(path.join(appPath,file),'utf8');

test('PWA manifest is scoped to Group Generator and supplies Chromium-size icons',()=>{
 const manifest=JSON.parse(fromApp('manifest.webmanifest'));
 assert.equal(manifest.start_url,'./');
 assert.equal(manifest.scope,'./');
 assert.equal(manifest.display,'standalone');
 assert.equal(manifest.theme_color,'#193341');
 assert.ok(manifest.name.includes('Group Generator'));
 assert.ok(manifest.icons.some(x=>x.sizes==='192x192'&&x.type==='image/png'));
 assert.ok(manifest.icons.some(x=>x.sizes==='512x512'&&x.type==='image/png'&&x.purpose==='any'));
 assert.ok(manifest.icons.some(x=>x.sizes==='512x512'&&x.purpose==='maskable'));
});
test('app PNG icons have valid headers, palette data and expected dimensions',()=>{
 for(const [name,size] of [['icons/icon-192.png',192],['icons/icon-512.png',512],
 ['icons/icon-maskable-512.png',512],['icons/apple-touch-icon.png',180]]){
   const buf=fs.readFileSync(path.join(appPath,name));
   assert.equal(buf.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
   assert.equal(buf.readUInt32BE(16),size);
   assert.equal(buf.readUInt32BE(20),size);
   const chunks=[];let offset=8;
   while(offset<buf.length){
    const length=buf.readUInt32BE(offset),type=buf.toString('ascii',offset+4,offset+8);
    chunks.push({type,content:buf.subarray(offset+8,offset+8+length)});
    offset+=length+12;
    if(type==='IEND')break;
   }
   assert.ok(chunks.some(x=>x.type==='PLTE'));
   assert.ok(chunks.some(x=>x.type==='IEND'));
   const decompressed=zlib.inflateSync(Buffer.concat(chunks.filter(x=>x.type==='IDAT').map(x=>x.content)));
   assert.equal(decompressed.length,size*(1+Math.ceil(size/4)),'PNG pixel data length');
 }
});
test('group favicon and iPhone icons appear in the HTML head',()=>{
 const html=fromApp('index.html');
 assert.match(html,/href="\.\/favicon\.svg"/);
 assert.match(html,/href="\.\/manifest\.webmanifest"/);
 assert.match(html,/rel="apple-touch-icon"/);
 assert.match(fromApp('favicon.svg'),/three students in a group/);
 assert.match(html,/id="install-app"/);
 assert.match(html,/id="install-guide"/);
 assert.match(html,/id="pwa-update"/);
 assert.match(html,/src="\.\/app-install\.js"/);
});

function simulateSW(){
 const listeners=new Map(),stores=new Map();
 const base='https://geneseelearninglab.com/group-generator/';
 let fetchOffline=false,skipCalls=0;
 function makeCache(name){
   if(!stores.has(name))stores.set(name,new Map());
   const items=stores.get(name);
   return{
     addAll:async urls=>urls.forEach(url=>items.set(String(url),{url:String(url),ok:true,type:'basic',clone(){return this}})),
     match:async (url,options)=>{
       const key=typeof url==='string'?url:url.url;
       return items.get(key)||((options&&options.ignoreSearch)?items.get(key.split('?')[0]):undefined);
     },
     put:async (url,response)=>items.set(String(url),response)
   };
 }
 const caches={
  open:async name=>makeCache(name),
  keys:async ()=>[...stores.keys()],
  delete:async name=>stores.delete(name)
 };
 const self={
  registration:{scope:base},
  location:{origin:'https://geneseelearninglab.com'},
  clients:{claim:async()=>true},
  skipWaiting:()=>{skipCalls++;return Promise.resolve()},
  addEventListener:(type,fn)=>listeners.set(type,fn)
 };
 const context={self,caches,URL,Response:{error:()=>({error:true})},fetch:async request=>{
  if(fetchOffline)throw Error('Offline');
  return {ok:true,type:'basic',url:request.url,clone(){return this}};
 }};
 vm.runInNewContext(fromApp('sw.js'),context);
 async function dispatch(type,fields={}){
  let pending=null,responding=null;
  const event={
   ...fields,
   waitUntil:promise=>{pending=promise},
   respondWith:promise=>{responding=promise}
  };
  const handler=listeners.get(type);
  assert.ok(handler,'Service worker '+type+' listener exists');
  handler(event);
  if(pending)await pending;
  if(responding)return responding;
 }
 return {dispatch,stores,setOffline(value){fetchOffline=value},get skips(){return skipCalls}};
}
test('offline shell pre-caches only public static assets and serves the app without a network',async()=>{
 const sw=simulateSW();
 await sw.dispatch('install');
 const keys=[...sw.stores.keys()];
 assert.equal(keys.length,1);
 const cache=sw.stores.get(keys[0]);
 assert.ok([...cache.keys()].some(x=>x.endsWith('/group-generator/index.html')));
 assert.ok([...cache.keys()].some(x=>x.endsWith('/group-generator/favicon.svg')));
 assert.ok([...cache.keys()].some(x=>x.endsWith('/group-generator/vendor/jszip.min.js')));
 assert.ok([...cache.keys()].some(x=>x.endsWith('/styles.css')));
 assert.ok([...cache.keys()].every(x=>!x.includes('roster')&&!x.includes('student')&&!x.endsWith('.json')));
 sw.setOffline(true);
 for(const name of ['','index.html','export-formats.js','app-install.js','vendor/jspdf.umd.min.js']){
   const url='https://geneseelearninglab.com/group-generator/'+name;
   const response=await sw.dispatch('fetch',{request:{url,method:'GET',mode:name?'same-origin':'navigate'}});
   assert.ok(response&&response.ok,'offline '+name);
 }
});
test('service worker never intercepts private data or out-of-scope requests',async()=>{
 const sw=simulateSW();
 await sw.dispatch('install');
 const request={url:'https://geneseelearninglab.com/group-generator/private.json',method:'GET',mode:'same-origin'};
 const result=await sw.dispatch('fetch',{request});
 assert.equal(result,undefined);
 const offscope=await sw.dispatch('fetch',{request:{...request,url:'https://geneseelearninglab.com/index.html',mode:'navigate'}});
 assert.equal(offscope,undefined);
 const post=await sw.dispatch('fetch',{request:{...request,method:'POST'}});
 assert.equal(post,undefined);
 await sw.dispatch('message',{data:{type:'SKIP_WAITING'}});
 assert.equal(sw.skips,1);
});
function simulateInstall({userAgent='Mozilla/5.0',standalone=false,existingWorker=false,hasWaiting=false}={}){
 const listeners=new Map(),elements=new Map();
 let promptCount=0,reloaded=false,confirmResult=false;
 const createEl=id=>({
   id,hidden:id==='pwa-update',disabled:false,open:false,attrs:{},textContent:'',children:[],listeners:{},style:{},
   addEventListener(type,fn){this.listeners[type]=fn},
   click(){return this.listeners.click?.({target:this})},
   focus(){this.focused=true},
   replaceChildren(){this.children=[]},
   appendChild(child){this.children.push(child)},
   showModal(){this.open=true},
   close(){this.open=false},
   setAttribute(key,val){this.attrs[key]=val},
   removeAttribute(key){delete this.attrs[key]}
 });
 for(const id of ['install-app','pwa-update','install-guide','install-guide-title','install-guide-intro','install-guide-steps','install-guide-close','pwa-status'])elements.set(id,createEl(id));
 const document={getElementById:id=>elements.get(id),createElement:()=>createEl('li')};
 const regListeners={},workerListeners={},messages=[];
 const registration={
   waiting:hasWaiting?{postMessage:message=>messages.push(message)}:null,
   addEventListener:(type,fn)=>regListeners[type]=fn,
   update:async()=>true
 };
 const swListeners={};
 const navigator={
  userAgent,platform:'Linux',onLine:true,
  serviceWorker:{
    controller:existingWorker?{}:null,
    addEventListener:(type,fn)=>swListeners[type]=fn,
    register:async()=>registration
  }
 };
 const window={
  matchMedia:()=>({matches:standalone}),
  location:{reload:()=>{reloaded=true}},
  addEventListener:(type,fn)=>listeners.set(type,fn),
  confirm:()=>confirmResult
 };
 const location={protocol:'https:',hostname:'geneseelearninglab.com'};
 const globals={window,document,navigator,location};
 vm.runInNewContext(fromApp('app-install.js'),globals);
 return {elements,listeners,registration,swListeners,messages,
  setConfirm:v=>confirmResult=v,get reloaded(){return reloaded},get promptCount(){return promptCount},
  fireBeforeInstall(){
    const event={preventDefault(){this.prevented=true},prompt:async()=>{promptCount++},userChoice:Promise.resolve({outcome:'accepted'})};
    listeners.get('beforeinstallprompt')(event);return event;
  }};
}
test('install button offers manual iPhone Safari guidance if a prompt is unavailable',()=>{
 const app=simulateInstall({userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS) AppleWebKit Safari'});
 app.elements.get('install-app').click();
 assert.equal(app.elements.get('install-guide').open,true);
 const steps=app.elements.get('install-guide-steps').children.map(x=>x.textContent);
 assert.ok(steps.some(x=>x.includes('Add to Home Screen')));
 assert.ok(steps.some(x=>x.includes('Safari')));
 app.elements.get('install-guide-close').click();
 assert.equal(app.elements.get('install-guide').open,false);
});
test('Chrome prompt is optional and installed apps hide the install button',async()=>{
 const app=simulateInstall();
 const event=app.fireBeforeInstall();
 assert.equal(event.prevented,true);
 await app.elements.get('install-app').click();
 assert.equal(app.promptCount,1);
 const installed=simulateInstall({standalone:true});
 assert.equal(installed.elements.get('install-app').hidden,true);
});
test('an update must be approved before the service worker reloads the app',async()=>{
 const app=simulateInstall({existingWorker:true,hasWaiting:true});
 await Promise.resolve();await Promise.resolve();
 assert.equal(app.elements.get('pwa-update').hidden,false);
 app.elements.get('pwa-update').click();
 assert.equal(app.messages.length,0,'must not update without consent');
 app.setConfirm(true);
 app.elements.get('pwa-update').click();
 assert.equal(app.messages.length,1);
 assert.equal(app.messages[0].type,'SKIP_WAITING');
 assert.equal(app.reloaded,false);
 app.swListeners.controllerchange();
 assert.equal(app.reloaded,true);
});
