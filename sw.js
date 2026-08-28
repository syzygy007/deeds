/* DEEDS. service worker v2
   Caching: navigations are network first (deploys always win), the Bible
   volumes and brand assets are cache first (instant, offline capable).
   v2: every garden picture and song under /garden/ is cache first too, so the
   garden downloads once per device. Bump GARDEN when garden files change in
   place under the same name (new names need nothing).
   Push: shows the alert, tapping it opens or focuses DEEDS. on Activity. */
'use strict';
var CACHE='deeds-sw-v2';
var GARDEN='deeds-garden-v1';
var STATIC=/^\/(bible-(kjv|web)\.json|icon-[a-z0-9-]+\.png|favicon\.ico|[a-z0-9-]+-og\.jpg|manifest\.webmanifest)$/;
var GARDENF=/^\/garden\/[a-z0-9-]+\.(webp|mp3|jpg|png|json)$/;

self.addEventListener('install',function(){self.skipWaiting()});

self.addEventListener('activate',function(e){
e.waitUntil(caches.keys().then(function(ks){
return Promise.all(ks.map(function(k){if(k!==CACHE&&k!==GARDEN)return caches.delete(k)}))
}).then(function(){return self.clients.claim()}))});

self.addEventListener('fetch',function(e){
var req=e.request;
if(req.method!=='GET')return;
var url;
try{url=new URL(req.url)}catch(err){return}
if(url.origin!==self.location.origin)return;
if(req.mode==='navigate'){
e.respondWith(fetch(req).then(function(res){
var cp=res.clone();caches.open(CACHE).then(function(c){c.put(req,cp)});
return res
}).catch(function(){
return caches.match(req).then(function(m){return m||caches.match('/')})
}));
return}
if(GARDENF.test(url.pathname)){e.respondWith(garden(req,url));return}
if(STATIC.test(url.pathname)){
e.respondWith(caches.match(req).then(function(m){
if(m)return m;
return fetch(req).then(function(res){
var cp=res.clone();caches.open(CACHE).then(function(c){c.put(req,cp)});
return res})
}))}
});

/* garden files: cache first, whole files stored, byte ranges (audio seeking, Safari's probes) served from the stored copy */
function garden(req,url){
var key=url.origin+url.pathname;
return caches.open(GARDEN).then(function(c){
return c.match(key).then(function(m){
if(m)return ranged(req,m);
return fetch(new Request(key,{credentials:'same-origin'})).then(function(res){
if(res.ok&&res.status===200){var cp=res.clone();c.put(key,cp)}
return ranged(req,res)
}).catch(function(){return c.match(key).then(function(m2){return m2?ranged(req,m2):Response.error()})})
})})}
function ranged(req,res){
var range=req.headers.get('range');
if(!range||res.status!==200)return res;
return res.arrayBuffer().then(function(buf){
var size=buf.byteLength,m=/bytes=(\d*)-(\d*)/.exec(range);
if(!m)return new Response(buf,{status:200,headers:res.headers});
var start=m[1]?parseInt(m[1],10):Math.max(0,size-parseInt(m[2]||'0',10));
var end=(m[1]&&m[2])?Math.min(size-1,parseInt(m[2],10)):size-1;
if(start>=size||start>end)return new Response(null,{status:416,headers:{'Content-Range':'bytes */'+size}});
var h=new Headers(res.headers);
h.set('Content-Range','bytes '+start+'-'+end+'/'+size);h.set('Content-Length',String(end-start+1));h.set('Accept-Ranges','bytes');
return new Response(buf.slice(start,end+1),{status:206,statusText:'Partial Content',headers:h})
})}

self.addEventListener('push',function(e){
var d={};
try{d=e.data?e.data.json():{}}catch(err){d={body:(e.data&&e.data.text)?e.data.text():''}}
var opts={body:d.body||'',icon:'/icon-192.png',badge:'/icon-192.png',data:{url:d.url||'/?al=1'}};
if(d.tag)opts.tag=d.tag;
e.waitUntil(self.registration.showNotification(d.title||'DEEDS.',opts))});

self.addEventListener('notificationclick',function(e){
e.notification.close();
var url=(e.notification.data&&e.notification.data.url)||'/?al=1';
e.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(function(list){
for(var i=0;i<list.length;i++){
var c=list[i];
if('focus' in c){c.focus();if(c.postMessage)c.postMessage({deeds:'alerts'});return}
}
if(self.clients.openWindow)return self.clients.openWindow(url)
}))});

self.addEventListener('message',function(e){
if(e.data&&e.data.type==='SKIP_WAITING')self.skipWaiting()});
