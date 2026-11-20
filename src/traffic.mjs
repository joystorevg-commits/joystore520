// First-party aggregate counters. No visitor identifiers, IP, cookies, raw URLs or referrers are stored.
const pages=new Set(['bio','catalogo','produto']);
const sources=new Set(['instagram','google','facebook','direto','interno','outros']);
const events=new Set(['page_view','view_item','whatsapp_click','catalog_click']);
const localDay=(offset=0)=>new Date(Date.now()-4*3600000+offset*86400000).toISOString().slice(0,10);
const response=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});
const ensure=env=>env.DB.prepare(`CREATE TABLE IF NOT EXISTS joy_traffic_daily (
 day TEXT NOT NULL, event TEXT NOT NULL, page TEXT NOT NULL, source TEXT NOT NULL,
 total INTEGER NOT NULL DEFAULT 0 CHECK(total>=0),
 PRIMARY KEY(day,event,page,source)
)`).run();
async function smallBody(req){
 const reader=req.body?.getReader(); if(!reader)throw new Error('empty');
 let length=0,content=''; const decoder=new TextDecoder();
 while(true){const {value,done}=await reader.read();if(done)break;length+=value.byteLength;if(length>1024){await reader.cancel();throw new Error('large');}content+=decoder.decode(value,{stream:true});}
 return JSON.parse(content+decoder.decode());
}
export async function recordTraffic(req,env){
 const origin=req.headers.get('origin'), own=new URL(req.url).origin;
 if(!origin||(origin!==own&&origin!==env.CATALOG_ORIGIN))return response({error:'Origem não autorizada.'},403);
 if(!/^text\/plain(?:;|$)/i.test(req.headers.get('content-type')||''))return response({error:'Formato inválido.'},415);
 let b;try{b=await smallBody(req);}catch{return response({error:'Dados inválidos.'},400);}
 if(!b||typeof b!=='object'||Array.isArray(b)||Object.keys(b).length!==3||!events.has(b.event)||!pages.has(b.page)||!sources.has(b.source))return response({error:'Evento inválido.'},400);
 if((b.event==='view_item'&&b.page!=='produto')||(b.event==='catalog_click'&&b.page!=='bio'))return response({error:'Evento inválido.'},400);
 try{
  await ensure(env);
  await env.DB.prepare(`INSERT INTO joy_traffic_daily(day,event,page,source,total) VALUES(?,?,?,?,1)
    ON CONFLICT(day,event,page,source) DO UPDATE SET total=total+1`).bind(localDay(),b.event,b.page,b.source).run();
  return new Response(null,{status:204,headers:{'Cache-Control':'no-store'}});
 }catch{return response({error:'Estatísticas temporariamente indisponíveis.'},503);}
}
export async function trafficSummary(req,env){
 const days=new URL(req.url).searchParams.get('days')||'7';if(!['7','30'].includes(days))return response({error:'Período inválido.'},400);
 const from=localDay(1-Number(days)),to=localDay();
 try{
  await ensure(env);
  // Retain aggregate history for 180 days when consulted. No impact on sales or inventory tables.
  await env.DB.prepare('DELETE FROM joy_traffic_daily WHERE day<?').bind(localDay(-179)).run();
  const {results}=await env.DB.prepare('SELECT day,event,page,source,total FROM joy_traffic_daily WHERE day>=? AND day<=? ORDER BY day').bind(from,to).all();
  const totals={page_view:0,view_item:0,whatsapp_click:0,catalog_click:0};
  const origins={},whatsappByPage={},daily={};
  for(let i=1-Number(days);i<=0;i++)daily[localDay(i)]={views:0,clicks:0};
  for(const r of results){const n=Number(r.total);totals[r.event]+=n;if(r.event==='page_view'){origins[r.source]=(origins[r.source]||0)+n;daily[r.day].views+=n;}if(r.event==='whatsapp_click'){whatsappByPage[r.page]=(whatsappByPage[r.page]||0)+n;daily[r.day].clicks+=n;}}
  return response({from,to,days:Number(days),totals,origins,whatsappByPage,daily:Object.entries(daily).map(([day,v])=>({day,...v}))});
 }catch{return response({error:'Estatísticas temporariamente indisponíveis.'},503);}
}
