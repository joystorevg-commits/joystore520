// Public SEO only. No customer, cost, sales or administrative data is read.
export const SITE='https://joystoremodafeminina.com.br';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const compact=v=>String(v??'').replace(/\s+/g,' ').trim();
const absoluteImage=v=>{try{const u=new URL(v,SITE+'/');return v&&u.protocol==='https:'?u.href:null;}catch{return null;}};
export const productURL=id=>SITE+'/index.html?produto='+encodeURIComponent(id);
const htmlMeta=(name,value,property=false)=>`<meta ${property?'property':'name'}="${esc(name)}" content="${esc(value)}">`;
function head({title,description,url,image,type='website',price,available,structured,noindex=false}){
 const meta=[`<title>${esc(title)}</title>`,htmlMeta('description',description),`<link rel="canonical" href="${esc(url)}">`,htmlMeta('og:type',type,true),htmlMeta('og:site_name','Joy Store',true),htmlMeta('og:locale','pt_BR',true),htmlMeta('og:title',title,true),htmlMeta('og:description',description,true),htmlMeta('og:url',url,true),htmlMeta('twitter:card','summary_large_image'),htmlMeta('twitter:title',title),htmlMeta('twitter:description',description)];
 if(image)meta.push(htmlMeta('og:image',image,true),htmlMeta('twitter:image',image));
 if(price!==undefined)meta.push(htmlMeta('product:price:amount',price,true),htmlMeta('product:price:currency','BRL',true),htmlMeta('product:availability',available?'in stock':'out of stock',true));
 if(noindex)meta.push(htmlMeta('robots','noindex, follow'));
 if(structured)meta.push(`<script type="application/ld+json">${JSON.stringify(structured).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026')}</script>`);
 return '<!-- JOY_SEO_START -->'+meta.join('')+'<!-- JOY_SEO_END -->';
}
export const homeHead=()=>head({title:'Joy Store | Moda feminina em Várzea Grande e Cuiabá',description:'Conheça a coleção de moda feminina da Joy Store. Vestidos, conjuntos, blusas e outras peças. Consulte disponibilidade e compre pelo WhatsApp.',url:SITE+'/',image:SITE+'/assets/produto2.jpg',structured:{'@context':'https://schema.org','@type':'WebSite',name:'Joy Store',url:SITE+'/'}});
const all=async(env,sql,...values)=>(await env.DB.prepare(sql).bind(...values).all()).results;
const first=(env,sql,...values)=>env.DB.prepare(sql).bind(...values).first();
export async function seoRoute(req,env){
 const url=new URL(req.url),path=url.pathname;
 if(!['GET','HEAD'].includes(req.method))return null;
 if(path==='/sitemap.xml'){
  const products=await all(env,'SELECT id FROM products WHERE active=1 ORDER BY id');
  const urls=[SITE+'/',...products.map(p=>productURL(p.id))];
  const xml='<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+urls.map(u=>`  <url><loc>${esc(u)}</loc></url>`).join('\n')+'\n</urlset>\n';
  return new Response(req.method==='HEAD'?null:xml,{headers:{'Content-Type':'application/xml; charset=utf-8','Cache-Control':'no-store'}});
 }
 if(!['/','/index.html'].includes(path)||!url.searchParams.has('produto'))return null;
 const productId=url.searchParams.get('produto');
 const p=productId&&productId.length<=80?await first(env,'SELECT id,name,category,price,image FROM products WHERE id=? AND active=1',productId):null;
 // Fetch the actual storefront shell without the query or conditional headers.
 const asset=await env.ASSETS.fetch(new Request(new URL('/',url.origin),{method:'GET'}));
 if(!asset.ok)return asset;
 let html=await asset.text();
 const headers=new Headers(asset.headers);for(const h of ['Content-Length','Content-Encoding','ETag','Last-Modified','Content-Range'])headers.delete(h);
 headers.set('Content-Type','text/html; charset=utf-8');headers.set('Cache-Control','no-store');
 const putHead=value=>{html=html.replace(/<!-- JOY_SEO_START -->[\s\S]*?<!-- JOY_SEO_END -->/,()=>value);};
 if(!p){
  putHead(head({title:'Produto indisponível | Joy Store',description:'Esta peça não está mais no catálogo. Conheça outras peças da Joy Store.',url:productURL(productId||''),noindex:true}));
  headers.set('X-Robots-Tag','noindex, follow');
  html=html.replace('<h2>Encontre seu favorito</h2>','<h2>Produto indisponível</h2>').replace('Carregando peças disponíveis…','Esta peça não está mais no catálogo.');
  return new Response(req.method==='HEAD'?null:html,{status:404,headers});
 }
 const variants=await all(env,'SELECT color,size,stock FROM variants WHERE product_id=? ORDER BY color,size',p.id);
 const photoTable=await first(env,"SELECT name FROM sqlite_master WHERE type='table' AND name='product_images'");
 const photos=photoTable?await all(env,'SELECT url FROM product_images WHERE product_id=? ORDER BY position',p.id):[];
 const images=[...new Set([p.image,...photos.map(x=>x.url)].map(absoluteImage).filter(Boolean))];
 const available=variants.some(v=>Number(v.stock)>0),price=(Number(p.price)/100).toFixed(2),name=compact(p.name),category=compact(p.category),canonical=productURL(p.id);
 const description=`${name}${category?' — '+category:''}. R$ ${price.replace('.',',')}. ${available?'Disponível para consulta pelo WhatsApp.':'Esgotado no momento.'} Confira na Joy Store.`;
 const structured={'@context':'https://schema.org','@type':'Product',name,description,sku:p.id,url:canonical,...(category?{category}:{}),...(images.length?{image:images}:{}),offers:{'@type':'Offer',url:canonical,priceCurrency:'BRL',price,availability:'https://schema.org/'+(available?'InStock':'OutOfStock'),seller:{'@type':'Organization',name:'Joy Store'}}};
 putHead(head({title:name+' | Joy Store',description,url:canonical,image:images[0],type:'product',price,available,structured}));
 // Render genuine catalog content in the first HTML, then retain normal client-side behavior.
 html=html.replace('<section class="store-hero">','<section class="store-hero" hidden style="display:none">').replace('<nav class="store-nav">','<nav class="store-nav" hidden style="display:none">');
 html=html.replace('<h2>Encontre seu favorito</h2>',()=>'<h2>'+esc(name)+'</h2>').replace('Carregando peças disponíveis…',()=>esc(available?'Confira a peça e escolha a cor e o tamanho para consultar pelo WhatsApp.':'Esta peça está esgotada no momento.'));
 const initial=`<a href="/">← Voltar à loja</a><div class="product-detail"><div>${images[0]?`<img src="${esc(images[0])}" alt="${esc(name)}" style="max-width:100%;border-radius:12px">`:''}</div><div><p>${esc(category)}</p><h3>${esc(name)}</h3><div class="price">R$ ${esc(price.replace('.',','))}</div><p>${available?'Disponível':'Esgotado'}</p><p>Carregando opções de compra…</p></div></div>`;
 html=html.replace('<section id="products" class="store-grid"></section>',()=>'<section id="products" class="store-grid" style="display:block">'+initial+'</section>');
 return new Response(req.method==='HEAD'?null:html,{headers});
}
