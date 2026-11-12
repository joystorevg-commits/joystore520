// GitHub credentials stay in Worker secrets; only public photo URLs reach clients.
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
export async function savePhoto(bytes,env,send=fetch){
 const owner=env.PHOTO_GITHUB_OWNER,repo=env.PHOTO_GITHUB_REPO;
 if(!env.PHOTO_GITHUB_TOKEN||!owner||!repo)fail('O envio de fotos ainda não foi configurado.',503);
 if(!/^[a-zA-Z0-9-]+$/.test(owner)||!/^[a-zA-Z0-9_.-]+$/.test(repo))fail('Configuração de fotos inválida.',503);
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('');
 const path='produtos/'+hash+'.jpg',base=`https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
 const headers={'Authorization':'Bearer '+env.PHOTO_GITHUB_TOKEN,'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'JoyStore520'};
 const call=async(url,options={})=>{try{return await send(url,{...options,headers:{...headers,...options.headers},redirect:'error',signal:AbortSignal.timeout(20000)});}catch{fail('Não foi possível enviar a foto. Tente novamente.',502);}};
 const raw=ref=>`https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${path}`;
 const existing=await call(base+'?ref=main');
 if(existing.ok)return raw('main');
 if(existing.status!==404)fail('GitHub recusou o acesso às fotos. Confira a validade e permissão da chave.',502);
 let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
 const result=await call(base,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:'Adicionar foto de produto',branch:'main',content:btoa(binary)})});
 if(result.ok){const data=await result.json();if(!/^[a-f0-9]{40}$/.test(data.commit?.sha||''))fail('Resposta inesperada do GitHub.',502);return raw(data.commit.sha);}
 // A concurrent/retried identical upload may already have created this path.
 if([409,422].includes(result.status)){const check=await call(base+'?ref=main');if(check.ok)return raw('main');}
 fail('Não foi possível salvar a foto no GitHub. Confira o repositório e as permissões ou tente novamente.',502);
}
