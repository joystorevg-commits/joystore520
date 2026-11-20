import {test} from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.mjs';
import {D1} from './d1.mjs';
const origin='http://localhost',env={DB:new D1(),AUTH_PEPPER:'test-only-pepper-'.repeat(3),SETUP_TOKEN:'test-only-setup-'.repeat(3),ENVIRONMENT:'local',CATALOG_ORIGIN:'https://joystorevg-commits.github.io',ASSETS:{fetch:()=>new Response('shell',{headers:{'Content-Type':'text/html'}})}};
env.DB.migrate();
async function request(path,{method='GET',data,auth,headers={}}={}){return worker.fetch(new Request(origin+path,{method,headers:{...(method==='POST'?{'Origin':origin,'Content-Type':'application/json'}:{}),...(auth?{Cookie:auth.cookie,'X-CSRF-Token':auth.csrf}:{}),...headers},body:data===undefined?undefined:JSON.stringify(data)}),env);}
const post=(data,headers={})=>request('/api/traffic',{method:'POST',data,headers:{'Content-Type':'text/plain;charset=UTF-8',...headers}});
async function login(email,password){const r=await request('/api/login',{method:'POST',data:{email,password}});assert.equal(r.status,200);const d=await r.json();return {cookie:r.headers.get('set-cookie').split(';')[0],csrf:d.csrf};}
await test('aggregate tracking accepts only permitted categories and origin, no session needed',async()=>{
 const evt={event:'page_view',page:'bio',source:'instagram'};
 assert.equal((await post(evt)).status,204);
 assert.equal((await post(evt)).status,204);
 assert.equal((await post({event:'whatsapp_click',page:'bio',source:'instagram'})).status,204);
 assert.equal((await post({event:'view_item',page:'produto',source:'interno'})).status,204);
 assert.equal((await post({event:'catalog_click',page:'bio',source:'instagram'})).status,204);
 assert.equal((await post(evt,{Origin:env.CATALOG_ORIGIN})).status,204);
 assert.equal((await post(evt,{Origin:'https://evil.example'})).status,403);
 assert.equal((await post({...evt,source:'https://unknown.example/private'})).status,400);
 assert.equal((await post({...evt,email:'x@example.com'})).status,400);
 assert.equal((await post({event:'view_item',page:'bio',source:'direto'})).status,400);
 assert.equal((await post({...evt,source:'x'.repeat(2000)})).status,400);
 assert.equal((await request('/api/traffic-summary')).status,401);
 const columns=env.DB.db.prepare('PRAGMA table_info(joy_traffic_daily)').all().map(x=>x.name);assert.deepEqual(columns,['day','event','page','source','total']);
});
await test('owner sees correct totals, dates, and channel grouping; sellers cannot access report',async()=>{
 assert.equal((await request('/api/setup',{method:'POST',data:{name:'Dona',email:'dona@example.com',password:'senha-de-teste-12345'},headers:{'X-Setup-Token':env.SETUP_TOKEN}})).status,201);
 const owner=await login('dona@example.com','senha-de-teste-12345');
 const r=await request('/api/traffic-summary?days=7',{auth:owner});assert.equal(r.status,200);const d=await r.json();assert.deepEqual(d.totals,{page_view:3,view_item:1,whatsapp_click:1,catalog_click:1});assert.deepEqual(d.origins,{instagram:3});assert.deepEqual(d.whatsappByPage,{bio:1});assert.equal(d.daily.length,7);assert.equal(d.daily.at(-1).views,3);
 assert.equal((await (await request('/api/traffic-summary?days=30',{auth:owner})).json()).daily.length,30);
 assert.equal((await request('/api/traffic-summary?days=999',{auth:owner})).status,400);
 assert.equal((await request('/api/users',{method:'POST',auth:owner,data:{name:'Vendedora',email:'seller@example.com',password:'senha-vendedora-12345',role:'seller'},headers:{'Idempotency-Key':crypto.randomUUID()}})).status,201);
 const seller=await login('seller@example.com','senha-vendedora-12345');assert.equal((await request('/api/traffic-summary',{auth:seller})).status,403);
});
await test('public page permits GTM while management page keeps strict CSP',async()=>{const pub=await worker.fetch(new Request(origin+'/links/'),env),panel=await worker.fetch(new Request(origin+'/painel.html'),env);assert.match(pub.headers.get('Content-Security-Policy'),/script-src 'self' https:\/\/www\.googletagmanager\.com/);assert.match(panel.headers.get('Content-Security-Policy'),/script-src 'self';/);});
