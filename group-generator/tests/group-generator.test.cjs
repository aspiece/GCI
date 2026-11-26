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
 const URL={createObjectURL:()=> 'blob:generated',revokeObjectURL:()=>{}};
 function Blob(){}
 const confirm=()=>true,prompt=()=> 'Period A';
 new Function('document','window','localStorage','navigator','location','URL','Blob','confirm','prompt','setTimeout','clearTimeout','Uint32Array',script)(
  document,window,localStorage,navigator,location,URL,Blob,confirm,prompt,()=>0,()=>{},Uint32Array
 );
 function sizes(){return el.groups.children.map(card=>card.children.at(-1).children.length)}
 function students(){return el.groups.children.flatMap(card=>card.children.at(-1).children.map(li=>li.children[0].textContent))}
 return {el,store,window,navigator,toggle,sizes,students}
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
