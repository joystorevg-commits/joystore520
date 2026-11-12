(function(){const login=document.querySelector('#login-screen'),app=document.querySelector('#app'),form=document.querySelector('#login-form');let loaded=false;
function signedOut(){app.hidden=true;login.hidden=false;document.querySelector('#page').replaceChildren();document.querySelector('#password').value='';document.querySelector('#account-name').textContent='';loaded=false;}
document.addEventListener('joy-logout',signedOut);
async function show(){login.hidden=true;app.hidden=false;document.querySelector('#account-name').textContent=Joy.user().name;loaded=true;document.dispatchEvent(new Event('joy-ready'));}
form.addEventListener('submit',async e=>{e.preventDefault();const button=form.querySelector('button');button.disabled=true;document.querySelector('#login-error').textContent='';try{await Joy.login(form.email.value,form.password.value);form.password.value='';await show();}catch(e){document.querySelector('#login-error').textContent=e.message;}finally{button.disabled=false;}});
document.addEventListener('click',async e=>{if(e.target.closest('[data-logout]')){await Joy.logout();}});
Joy.init().then(show).catch(e=>{signedOut();if(e.status!==401)document.querySelector('#login-error').textContent=e.message;});
setInterval(async()=>{if(!loaded||document.hidden)return;try{await Joy.refresh();document.querySelector('#sync-state').textContent='● Atualizado agora';document.querySelector('#connection-warning').hidden=true;document.dispatchEvent(new Event('joy-refresh'));}catch(e){document.querySelector('#sync-state').textContent='● Sem atualização';const w=document.querySelector('#connection-warning');w.textContent=e.message;w.hidden=false;}},30000);
window.addEventListener('offline',()=>{const w=document.querySelector('#connection-warning');w.textContent='Sem conexão. As vendas só são confirmadas após resposta do servidor.';w.hidden=false;});
if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
})();
