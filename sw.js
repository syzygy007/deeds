/* DEEDS. service worker v1
   Caching: navigations are network first (deploys always win), the Bible
   volumes and brand assets are cache first (instant, offline capable).
   Push: shows the alert, tapping it opens or focuses DEEDS. on Activity. */
'use strict';
var CACHE='deeds-sw-v1';
var STATIC=/^\/(bible-(kjv|web)\.json|icon-[a-z0-9-]+\.png|favicon\.ico|[a-z0-9-]+-og\.jpg|manifest\.webmanifest)$/;

self.addEventListener('install',function(){self.skipWaiting()});

self.addEventListener('activate',function(e){
e.waitUntil(caches.keys().then(function(ks){
return Promise.all(ks.map(function(k){if(k!==CACHE)return caches.delete(k)}))
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
if(STATIC.test(url.pathname)){
e.respondWith(caches.match(req).then(function(m){
if(m)return m;
return fetch(req).then(function(res){
var cp=res.clone();caches.open(CACHE).then(function(c){c.put(req,cp)});
return res})
}))}
});

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
