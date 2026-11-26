// Run with: node --test group-generator/tests/group-generator.test.cjs
// Exercises the actual inline app logic without external dependencies or student data.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const script=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].at(-1)?.[1];
assert.ok(script,'Group Generator script must exist');

function launch(){
 class Classes{
  constructor(){this.state=new Set()}
  contains(k){return this.state.has(k)}
  add(k){this.state.add(k)}
  remove(k){this.state.delete(k)}
  toggle(k,v){const add=v===undefined?!this.contains(k):Boolean(v);if(add)this.add(k);else this.remove(k);return add}
 }
 class Node{
  constructor(tag='div',id=''){this.tagName=tag.toUpperCase();this.id=id;this.children=[];this.listeners={};this.attrs={};this.style={setProperty:(k,v)=>this.style[k]=v};this.classList=new Classes();this.textContent='';this.value='';this.hidden=false;this.disabled=false;this.title=''}
  addEventListener(k,f){(this.listeners[k]??=[]).push(f)}
  fire(k){let result;for(const f of this.listeners[k]||[])result=f.call(this,{target:this,currentTarget:this,key:k});return result}
  click(){return this.fire('click')}
  appendChild(n){this.children.push(n);return n}
  append(...nodes){for(const n of nodes)this.appendChild(n)}
  replaceChildren(...nodes){this.children=[...nodes]}
  setAttribute(k,v){this.attrs[k]=String(v)}
  getAttribute(k){return this.attrs[k]??null}
  remove(){this.removed=true}
  focus(){this.focused=true}
  select(){this.selected=true}
 }
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
 const el=Object.fromEntries(ids.map(id=>[id,new Node('div',id)]));
 el.quantity.value='4';
 const toggle=new Node('button','nav-toggle');
 const document={
  body:new Node('body'),
  getElementById:id=>el[id]||null,
  querySelector:s=>s==='.nav-toggle'?toggle:null,
  createElement:tag=>new Node(tag),
  addEventListener:()=>{},
  execCommand:()=>true
 };
 const store=new Map();
 const localStorage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)};
 let random=1977;
 const window={
  crypto:{getRandomValues:arr=>{random=(Math.imul(random,1664525)+1013904223)>>>0;arr[0]=random;return arr}},
  print:()=>{window.printed=true}
 };
 const location={origin:'https://geneseelearninglab.com',pathname:'/group-generator/'};
 const navigator={clipboard:{writeText:async text=>{navigator.copied=text}}};
 const downloads=new Map();let nextBlob=0;
 const URL={createObjectURL:file=>{const url='blob:generated-'+(++nextBlob);downloads.set(url,file);return url},revokeObjectURL:()=>{}};
 const Blob=globalThis.Blob;
 let promptValue='Period A',confirmValue=true;
 const confirm=()=>confirmValue,prompt=()=>promptValue;
 window.GroupExport={make:async(format,items)=>new Blob(['office-'+format+'-'+items.length])};
 new Function('document','window','localStorage','navigator','location','URL','Blob','confirm','prompt','setTimeout','clearTimeout','Uint32Array',script)(
  document,window,localStorage,navigator,location,URL,Blob,confirm,prompt,()=>0,()=>{},Uint32Array
 );
 function sizes(){return el.groups.children.map(card=>card.children.at(-1).children.length)}
 function students(){return el.groups.children.flatMap(card=>card.children.at(-1).children.map(li=>li.children[0].textContent))}
 return {el,store,window,navigator,toggle,sizes,students,downloads,setPrompt:value=>{promptValue=value},setConfirm:value=>{confirmValue=value}}
}
test('starts with disabled result actions and validates an empty roster',()=>{
 const {el}=launch();
 assert.equal(el.copy.disabled,true);
 assert.equal(el.project.disabled,true);
 el.generate.click();
 assert.match(el.status.textContent,/Add at least one student/);
});
test('random distribution creates balanced size-based and count-based groups',()=>{
 const a=launch(),{el}=a;
 el.sample.click();
 assert.equal(el.students.textContent,24);
 el.generate.click();
 assert.deepEqual(a.sizes(),[4,4,4,4,4,4]);
 assert.equal(new Set(a.students()).size,24);
 el.shuffle.click();
 assert.equal(a.students().length,24);
 el['mode-count'].click();
 el.quantity.value='5';el.quantity.fire('change');el.generate.click();
 assert.equal(a.sizes().length,5);
 assert.ok(Math.max(...a.sizes())-Math.min(...a.sizes())<=1);
 el.quantity.value='999';el.quantity.fire('change');el.generate.click();
 assert.equal(a.sizes().length,24);
 assert.ok(a.sizes().every(n=>n===1));
});
test('moving the final student out of a group removes the empty group',()=>{
 const a=launch(),{el}=a;
 el.roster.value='A\nB';el.roster.fire('input');
 el['mode-count'].click();el.quantity.value='2';el.quantity.fire('change');el.generate.click();
 assert.deepEqual(a.sizes(),[1,1]);
 const mover=el.groups.children[1].children[1].children[0].children[1];
 mover.value='0';mover.fire('change');
 assert.deepEqual(a.sizes(),[2]);
 assert.equal(a.students().length,2);
});
test('preserves duplicate names and normalizes invalid group sizes',()=>{
 const a=launch(),{el}=a;
 el.roster.value='Alex\nAlex\nSam';el.roster.fire('input');
 el.generate.click();
 assert.equal(a.students().filter(n=>n==='Alex').length,2);
 el.quantity.value='0';el.quantity.fire('change');el.generate.click();
 assert.equal(Number(el.quantity.value),1);
 assert.deepEqual(a.sizes(),[1,1,1]);
});
test('saves, restores and deletes rosters only in local browser storage',()=>{
 const {el,store}=launch();
 el.roster.value='Alex\nSam';el.roster.fire('input');el.save.click();
 const stored=JSON.parse(store.get('gci-group-generator-rosters-v1'));
 assert.equal(stored['Period A'],'Alex\nSam');
 el.roster.value='';el.roster.fire('input');
 el.saved.value='Period A';el.saved.fire('change');
 assert.equal(el.roster.value,'Alex\nSam');
 el['delete-saved'].click();
 assert.equal(Object.hasOwn(JSON.parse(store.get('gci-group-generator-rosters-v1')),'Period A'),false);
 el.clear.click();
 assert.equal(el.roster.value,'');
 assert.equal(el.groups.children.length,0);
});
test('shares only the application URL; copying and presentation controls work',async()=>{
 const a=launch(),{el,navigator,window,toggle}=a;
 el.sample.click();el.generate.click();
 await el.copy.click();
 assert.match(navigator.copied,/Group 1 \(4\)/);
 await el.share.click();
 assert.equal(navigator.copied,'https://geneseelearninglab.com/group-generator/');
 el.project.click();
 assert.equal(el.project.attrs['aria-pressed'],'true');
 el.project.click();
 assert.equal(el.project.attrs['aria-pressed'],'false');
 el.print.click();
 assert.equal(window.printed,true);
 el.download.click();
 toggle.click();
 assert.equal(toggle.attrs['aria-expanded'],'true');
 toggle.click();
 assert.equal(toggle.attrs['aria-expanded'],'false');
});


test('saving a grouping preserves exact manual moves and restores them locally',()=>{
 const a=launch(),{el,store}=a;
 el.roster.value='Alex\nSam\nTaylor\nJordan';el.roster.fire('input');
 el['mode-count'].click();el.quantity.value='2';el.quantity.fire('change');el.generate.click();
 const move=el.groups.children[0].children[1].children[0].children[1];
 move.value='1';move.fire('change');
 const expected=a.students().slice();
 const sizes=a.sizes().slice();
 assert.deepEqual(sizes,[1,3]);
 assert.equal(el['save-grouping'].disabled,false);
 el['save-grouping'].click();
 const stored=JSON.parse(store.get('gci-group-generator-groupings-v1'));
 assert.equal(stored['Period A'].mode,'count');
 assert.equal(stored['Period A'].quantity,2);
 assert.deepEqual(stored['Period A'].groups.map(group=>group.length),sizes);
 el.clear.click();
 assert.equal(el.groups.children.length,0);
 el['load-grouping'].click();
 assert.deepEqual(a.students(),expected);
 assert.deepEqual(a.sizes(),sizes);
 assert.equal(el.quantity.value,2);
 assert.equal(el['mode-count'].attrs['aria-pressed'],'true');
 assert.match(el['saved-grouping-state'].textContent,/saved/);
});
test('update, duplicate and delete are separate from saved class lists',()=>{
 const a=launch(),{el,store,setPrompt}=a;
 el.sample.click();el.generate.click();
 el['save-grouping'].click();
 const key='gci-group-generator-groupings-v1';
 assert.equal(Object.keys(JSON.parse(store.get(key))).length,1);
 const before=JSON.parse(store.get(key))['Period A'].groups.map(group=>group.slice());
 const move=el.groups.children[0].children[1].children[0].children[1];
 move.value='1';move.fire('change');
 assert.match(el['saved-grouping-state'].textContent,/unsaved changes/);
 el['update-grouping'].click();
 const updated=JSON.parse(store.get(key))['Period A'].groups;
 assert.notDeepEqual(updated,before);
 setPrompt('Period A Copy');
 el['duplicate-grouping'].click();
 const duplicated=JSON.parse(store.get(key));
 assert.deepEqual(duplicated['Period A Copy'].groups,updated);
 el['delete-grouping'].click();
 assert.ok(JSON.parse(store.get(key))['Period A']);
 assert.equal(JSON.parse(store.get(key))['Period A Copy'],undefined);
 assert.equal(store.get('gci-group-generator-rosters-v1'),undefined);
});
test('JSON backup can be exported and imported, but invalid backups do not overwrite saved data',async()=>{
 const a=launch(),{el,store,downloads,setConfirm}=a;
 el.sample.click();el.generate.click();
 el['save-grouping'].click();
 el['export-groupings'].click();
 assert.equal(downloads.size,1);
 const backupText=await [...downloads.values()][0].text();
 const backup=JSON.parse(backupText);
 assert.equal(backup.kind,'gci-group-generator-groupings');
 assert.ok(backup.groupings['Period A'].groups.length);
 el['delete-grouping'].click();
 assert.equal(Object.keys(JSON.parse(store.get('gci-group-generator-groupings-v1'))).length,0);
 el['import-groupings-file'].files=[{size:backupText.length,text:async()=>backupText}];
 await el['import-groupings-file'].fire('change');
 assert.ok(JSON.parse(store.get('gci-group-generator-groupings-v1'))['Period A']);
 const original=store.get('gci-group-generator-groupings-v1');
 el['import-groupings-file'].files=[{size:30,text:async()=>'{not valid json'}];
 await el['import-groupings-file'].fire('change');
 assert.equal(store.get('gci-group-generator-groupings-v1'),original);
 assert.match(el['saved-grouping-message'].textContent,/Import failed/);
 const changed=JSON.parse(backupText);changed.groupings['Period A'].groups[0][0]='OTHER STUDENT';
 changed.groupings['Period A'].roster[0]='OTHER STUDENT'; // May not match the first-group student, so reject import safely.
 el['import-groupings-file'].files=[{size:1000,text:async()=>JSON.stringify(changed)}];
 setConfirm(false);
 await el['import-groupings-file'].fire('change');
 assert.equal(store.get('gci-group-generator-groupings-v1'),original);
});
test('format selector triggers local Office download and keeps JSON backup separate',async()=>{
 const a=launch(),{el,downloads}=a;
 el.sample.click();el.generate.click();
 el['export-format'].value='xlsx';
 await el.download.click();
 assert.equal(downloads.size,1);
 assert.match(await [...downloads.values()][0].text(),/office-xlsx-6/);
 assert.equal(el['export-groupings'].disabled,true);
});


test('main Save groups creates and updates exact assignments without creating duplicates',()=>{
 const a=launch(),{el,store}=a;
 el.sample.click();el.generate.click();
 el['save-current'].click();
 const key='gci-group-generator-groupings-v1';
 assert.deepEqual(Object.keys(JSON.parse(store.get(key))),['Period A']);
 const move=el.groups.children[0].children[1].children[0].children[1];
 move.value='1';move.fire('change');
 el['save-current'].click();
 const stored=JSON.parse(store.get(key));
 assert.equal(Object.keys(stored).length,1);
 assert.deepEqual(stored['Period A'].groups.map(g=>g.length),a.sizes());
});
test('Undo restores exact groups after moving a student',()=>{
 const a=launch(),{el}=a;
 el.sample.click();el.generate.click();
 const before=a.students().slice(),sizes=a.sizes().slice();
 const move=el.groups.children[0].children[1].children[0].children[1];
 move.value='1';move.fire('change');
 assert.equal(el.undo.hidden,false);
 assert.notDeepEqual(a.sizes(),sizes);
 el.undo.click();
 assert.deepEqual(a.students(),before);
 assert.deepEqual(a.sizes(),sizes);
 assert.equal(el.undo.hidden,true);
});
test('reshuffle asks before replacing assignments and Undo restores previous version',()=>{
 const a=launch(),{el,setConfirm}=a;
 el.sample.click();el.generate.click();
 const before=a.students().slice();
 setConfirm(false);el.shuffle.click();
 assert.deepEqual(a.students(),before);
 setConfirm(true);el.shuffle.click();
 assert.equal(el.undo.hidden,false);
 el.undo.click();
 assert.deepEqual(a.students(),before);
});
test('editing the roster preserves a recoverable copy of previous grouping',()=>{
 const a=launch(),{el}=a;
 el.roster.value='Alex\nSam\nJordan';el.roster.fire('input');el.generate.click();
 const before=a.students().slice();
 el.roster.value='Alex\nSam';el.roster.fire('input');
 assert.equal(a.sizes().length,0);
 assert.equal(el.undo.hidden,false);
 el.undo.click();
 assert.equal(el.roster.value,'Alex\nSam\nJordan');
 assert.deepEqual(a.students(),before);
});
test('changing group settings supports Undo with original size and mode',()=>{
 const a=launch(),{el}=a;
 el.sample.click();el.generate.click();
 const before=a.students().slice();
 el['mode-count'].click();
 assert.equal(el.groups.children.length,0);
 el.undo.click();
 assert.deepEqual(a.students(),before);
 assert.equal(el['mode-size'].attrs['aria-pressed'],'true');
 assert.equal(el.quantity.value,4);
});
test('projector has a visible exit and does not require escape to return',()=>{
 const {el}=launch();
 el.sample.click();el.generate.click();
 el.project.click();
 assert.equal(el['exit-projector'].hidden,false);
 el['exit-projector'].click();
 assert.equal(el['exit-projector'].hidden,true);
 assert.equal(el.project.attrs['aria-pressed'],'false');
});
test('switching saved classes requires permission before discarding an active grouping',()=>{
 const a=launch(),{el,setConfirm}=a;
 el.roster.value='Student One\nStudent Two';el.roster.fire('input');
 el.save.click();
 el.sample.click();el.generate.click();
 const before=a.students().slice();
 el.saved.value='Period A';setConfirm(false);el.saved.fire('change');
 assert.deepEqual(a.students(),before);
 el.saved.value='Period A';setConfirm(true);el.saved.fire('change');
 assert.equal(el.groups.children.length,0);
 assert.equal(el.roster.value,'Student One\nStudent Two');
 el.undo.click();
 assert.deepEqual(a.students(),before);
});
