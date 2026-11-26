/* Classroom Group Generator — offline app shell only.
   No student names, locally saved rosters, or generated downloads are cached.
   The worker controls only the Group Generator directory. */
'use strict';
const CACHE_PREFIX='gci-group-generator-shell-';
const CACHE_NAME=CACHE_PREFIX+'v2';
const HOME=new URL('./',self.registration.scope);
const INDEX=new URL('index.html',HOME);
const CORE_FILES=[
 './','./index.html','./favicon.svg','./manifest.webmanifest','./app-install.js','./export-formats.js',
 './vendor/jszip.min.js','./vendor/jspdf.umd.min.js','../styles.css',
 './icons/icon.svg','./icons/icon-192.png','./icons/icon-512.png',
 './icons/icon-maskable-512.png','./icons/apple-touch-icon.png'
];
const CORE_URLS=CORE_FILES.map(path=>new URL(path,HOME).href);
const CORE_PATHS=new Set(CORE_URLS.map(href=>new URL(href).pathname));

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(CORE_URLS)));
  // Keep a new version waiting until the teacher explicitly chooses Update.
});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(key=>key.startsWith(CACHE_PREFIX)&&key!==CACHE_NAME).map(key=>caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('message',event=>{
  if(event.data&&event.data.type==='SKIP_WAITING')self.skipWaiting();
});
self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;
  const inScope=url.pathname===HOME.pathname||url.pathname===INDEX.pathname;
  // Ignore all dynamic, cross-origin, POST, or non-shell requests.
  if(!CORE_PATHS.has(url.pathname)&&!(request.mode==='navigate'&&inScope))return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE_NAME);
    // Prefer fresh files online; use the already installed files offline.
    try{
      const response=await fetch(request);
      if(response.ok&&response.type!=='opaque'){
        // Cache by canonical URL without query parameters.
        const canonical=new URL(url.pathname,url.origin).href;
        await cache.put(canonical,response.clone());
      }
      return response;
    }catch(error){
      const canonical=new URL(url.pathname,url.origin).href;
      const cached=await cache.match(canonical)||await cache.match(request,{ignoreSearch:true});
      if(cached)return cached;
      if(request.mode==='navigate'&&inScope){
        const entry=await cache.match(HOME.href)||await cache.match(INDEX.href);
        if(entry)return entry;
      }
      return Response.error();
    }
  })());
});
