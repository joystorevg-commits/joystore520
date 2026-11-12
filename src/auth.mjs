const enc=new TextEncoder();
export const hex=b=>Array.from(new Uint8Array(b),x=>x.toString(16).padStart(2,'0')).join('');
const unhex=s=>Uint8Array.from(s.match(/../g)||[],x=>parseInt(x,16));
export const random=()=>hex(crypto.getRandomValues(new Uint8Array(32)));
export const digest=async text=>hex(await crypto.subtle.digest('SHA-256',enc.encode(text)));
export function equal(a,b){let d=a.length^b.length;for(let i=0;i<Math.max(a.length,b.length);i++)d|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);return d===0;}
export function passwordCheck(p){if(typeof p!=='string'||p.length<12||p.length>256)throw Object.assign(new Error('Use uma senha entre 12 e 256 caracteres.'),{status:400});}
export async function hashPassword(password,pepper,salt=hex(crypto.getRandomValues(new Uint8Array(16)))){
 if(!pepper||pepper.length<32)throw Object.assign(new Error('Autenticação ainda não configurada.'),{status:503});
 const hmac=await crypto.subtle.importKey('raw',enc.encode(pepper),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const input=await crypto.subtle.sign('HMAC',hmac,enc.encode(password));
 const key=await crypto.subtle.importKey('raw',input,'PBKDF2',false,['deriveBits']);
 const result=await crypto.subtle.deriveBits({name:'PBKDF2',salt:unhex(salt),iterations:100000,hash:'SHA-512'},key,256);
 return `pbkdf2-sha512-hmac-v1$${salt}$${hex(result)}`;
}
export async function verifyPassword(password,stored,pepper){const salt=stored?.split('$')[1]||'00'.repeat(16);const computed=await hashPassword(password,pepper,salt);return !!stored&&equal(computed,stored);}
export const cookieName=env=>env.ENVIRONMENT==='local'?'joy_session':'__Host-joy_session';
export function cookie(token,env,age=43200){return `${cookieName(env)}=${token}; HttpOnly; Path=/; SameSite=Strict; Max-Age=${age}${env.ENVIRONMENT==='local'?'':'; Secure'}`;}
export async function session(req,env){const value=(req.headers.get('cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(cookieName(env)+'='))?.split('=')[1];if(!value||!/^[a-f0-9]{64}$/.test(value))return null;return env.DB.prepare('SELECT u.id,u.name,u.email,u.role,s.csrf,s.token_hash FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>? AND u.active=1').bind(await digest(value),Date.now()).first();}
export async function throttle(env,key,max){const now=Date.now(),row=await env.DB.prepare('INSERT INTO login_limits(key,count,expires_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN expires_at<? THEN 1 ELSE count+1 END,expires_at=CASE WHEN expires_at<? THEN excluded.expires_at ELSE expires_at END RETURNING count').bind(await digest(key),now+900000,now,now).first();if(row.count>max)throw Object.assign(new Error('Muitas tentativas. Aguarde 15 minutos.'),{status:429});}
