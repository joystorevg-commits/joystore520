/* Joy Store — public pages only. Basic consent mode (analytics only). */
(function () {
  'use strict';
  const GTM_ID = 'GTM-NKNL3RFW';
  const KEY = 'joy_analytics_consent_v1';
  const bio = /\/links(?:\/index\.html|\/)?$/.test(location.pathname);
  const pageType = bio ? 'bio' : new URLSearchParams(location.search).has('produto') ? 'produto' : 'catalogo';
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
    productView(p) { currentProduct = p; emitView(); },
    whatsapp(p) { event('whatsapp_click', {click_origin: 'produto', ...(p ? productFields(p) : {})}); }
  };
  if (bio) document.addEventListener('click', e => {
    const link = e.target.closest && e.target.closest('a');
    if (!link) return;
    if (link.id === 'whatsapp-link') event('whatsapp_click', {click_origin: 'bio_instagram'});
    else if (link.classList.contains('primary')) event('catalog_click', {click_origin: 'bio_instagram'});
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
    panel.innerHTML = '<strong>Preferências de privacidade</strong><p>Com sua autorização, usamos o Google Analytics para medir visitas e cliques. Você pode recusar sem afetar suas compras ou o WhatsApp.</p><div class="joy-consent-actions"><button type="button" data-yes>Aceitar análise</button><button type="button" data-no>Recusar</button></div>';
    const prefs = document.createElement('button');
    prefs.type = 'button'; prefs.className = 'joy-consent-settings'; prefs.textContent = 'Preferências de privacidade';
    (document.querySelector('footer') || document.body).appendChild(prefs);
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
