/* Joy Store — public pages only. Basic consent mode (analytics only). */
(function () {
  'use strict';
  const GTM_ID = 'GTM-PSJNNM9X';
  const KEY = 'joy_analytics_consent_v1';
  const bio = /\/links(?:\/index\.html|\/)?$/.test(location.pathname);
  const pageType = bio ? 'bio' : new URLSearchParams(location.search).has('produto') ? 'produto' : 'catalogo';
  // Independent aggregate counters: only fixed categories, never unique visitor IDs.
  const source = (() => {
    const query = new URLSearchParams(location.search);
    const utm = (query.get('utm_source') || '').toLowerCase();
    if (['instagram','ig','insta'].includes(utm)) return 'instagram';
    if (['google','googleads'].includes(utm)) return 'google';
    if (['facebook','fb','meta'].includes(utm)) return 'facebook';
    if (utm) return 'outros';
    try {
      if (!document.referrer) return 'direto';
      const r = new URL(document.referrer), h = r.hostname.toLowerCase();
      if (r.origin === location.origin || h === 'joystoremodafeminina.com.br' || h === 'www.joystoremodafeminina.com.br') return 'interno';
      if (h === 'instagram.com' || h.endsWith('.instagram.com')) return 'instagram';
      if (h === 'facebook.com' || h.endsWith('.facebook.com') || h === 'fb.com') return 'facebook';
      if (/^(?:[^.]+\.)*google\.(?:com|com\.br)$/.test(h)) return 'google';
    } catch (_) {}
    return 'outros';
  })();
  const statsOrigin = location.hostname === 'joystorevg-commits.github.io' ? 'https://joystoremodafeminina.com.br' : location.origin;
  function count(name) {
    // No cookie, no referrer, small fixed payload. Never block catalog or navigation.
    try { fetch(statsOrigin + '/api/traffic', {method:'POST',mode:'no-cors',credentials:'omit',referrerPolicy:'no-referrer',cache:'no-store',keepalive:true,headers:{'Content-Type':'text/plain;charset=UTF-8'},body:JSON.stringify({event:name,page:pageType,source})}).catch(()=>{}); } catch (_) {}
  }
  count('page_view');
  let ownViewed = false;
  let choice = null, loaded = false, currentProduct = null, viewed = false;
  try { choice = localStorage.getItem(KEY); } catch (_) {}
  if (choice !== 'yes' && choice !== 'no') choice = null;
  const layer = window.dataLayer = window.dataLayer || [];
  function gtag() { layer.push(arguments); }
  const consent = granted => ({analytics_storage: granted ? 'granted' : 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied'});
  gtag('consent', 'default', consent(false));
  function event(name, values) {
    if (choice !== 'yes' || !loaded) return;
    layer.push({event: name, page_type: pageType, ...values});
  }
  function productFields(p) {
    return {product_id: String(p.id), product_name: String(p.name), product_category: String(p.category || ''), product_price: Number(p.price), currency: 'BRL'};
  }
  function emitView() {
    if (choice !== 'yes' || !loaded || !currentProduct || viewed) return;
    viewed = true;
    const p = currentProduct;
    event('view_item', {...productFields(p), ecommerce: {currency: 'BRL', value: Number(p.price), items: [{item_id: String(p.id), item_name: String(p.name), item_category: String(p.category || ''), price: Number(p.price), quantity: 1}]}});
  }
  function load() {
    if (loaded || choice !== 'yes') return;
    gtag('consent', 'update', consent(true));
    layer.push({page_type: pageType});
    layer.push({'gtm.start': Date.now(), event: 'gtm.js'});
    loaded = true;
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtm.js?id=' + GTM_ID;
    document.head.appendChild(script);
    emitView();
  }
  window.JoyTracking = {
    productView(p) { if (!ownViewed && p) { ownViewed = true; count('view_item'); } currentProduct = p; emitView(); },
    whatsapp(p) { count('whatsapp_click'); event('whatsapp_click', {click_origin: 'produto', ...(p ? productFields(p) : {})}); }
  };
  if (bio) document.addEventListener('click', e => {
    const link = e.target.closest && e.target.closest('a');
    if (!link) return;
    if (link.id === 'whatsapp-link') { count('whatsapp_click'); event('whatsapp_click', {click_origin: 'bio_instagram'}); }
    else if (link.classList.contains('primary')) { count('catalog_click'); event('catalog_click', {click_origin: 'bio_instagram'}); }
    // Never cancel, delay or replace the original navigation.
  }, true);
  if (choice === 'yes') load();
  function setupConsent() {
    const css = document.createElement('style');
    css.textContent = '.joy-consent-settings{position:static;display:block;margin:16px auto;padding:7px 10px;border:0;background:transparent;color:#76585c;font:12px system-ui;text-decoration:underline;cursor:pointer}.joy-consent{position:fixed;z-index:9999;bottom:12px;left:50%;transform:translateX(-50%);width:min(480px,calc(100% - 24px));padding:18px;background:#fffaf6;color:#49383a;border:1px solid #d6b9ad;border-radius:14px;box-shadow:0 5px 25px #0002;font:14px/1.5 system-ui;text-align:left}.joy-consent[hidden]{display:none!important}.joy-consent strong{display:block;margin-bottom:5px}.joy-consent p{margin:0 0 12px!important;max-width:none!important;font:inherit!important;color:inherit!important}.joy-consent-actions{display:flex;gap:8px;flex-wrap:wrap}.joy-consent button{flex:1;padding:10px 12px;border:1px solid #80545a;border-radius:9px;background:white;color:#69494e;font:600 13px system-ui;cursor:pointer}.joy-consent button:first-child{background:#80545a;color:white}';
    document.head.appendChild(css);
    const panel = document.createElement('section');
    panel.className = 'joy-consent'; panel.hidden = choice !== null;
    panel.setAttribute('aria-label', 'Preferências de privacidade');
    panel.innerHTML = '<strong>Preferências de privacidade</strong><p>A loja mantém contagens agregadas de páginas e cliques, sem identificar visitantes ou usar cookies para isso. O Google Analytics é opcional e depende da sua autorização. Recusar o Google Analytics não afeta suas compras ou o WhatsApp.</p><div class="joy-consent-actions"><button type="button" data-yes>Aceitar análise</button><button type="button" data-no>Recusar</button></div>';
    const prefs = document.createElement('button');
    prefs.type = 'button'; prefs.className = 'joy-consent-settings'; prefs.textContent = 'Preferências de privacidade';
    const footer = document.querySelector('footer') || document.body;
    footer.appendChild(prefs);
    const notice = document.createElement('a');
    notice.href = bio ? '../privacidade.html' : './privacidade.html';
    notice.className = 'joy-consent-settings';
    notice.textContent = 'Privacidade de navegação';
    footer.appendChild(notice);
    document.body.appendChild(panel);
    prefs.addEventListener('click', () => { panel.hidden = !panel.hidden; });
    function choose(next) {
      const previous = choice;
      choice = next;
      try { localStorage.setItem(KEY, next); } catch (_) {}
      panel.hidden = true;
      if (next === 'yes') load();
      else if (previous === 'yes' && loaded) {
        gtag('consent', 'update', consent(false));
        // Reload removes the tag for this navigation; unsuccessful storage defaults to denied.
        location.reload();
      }
    }
    panel.querySelector('[data-yes]').addEventListener('click', () => choose('yes'));
    panel.querySelector('[data-no]').addEventListener('click', () => choose('no'));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setupConsent, {once:true});
  else setupConsent();
})();
