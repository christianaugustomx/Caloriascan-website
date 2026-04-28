/* ═══════════════════════════════════════════════════════
   CALORIA SCAN — Cookie Consent Banner (GDPR / Consent Mode v2)
   - Detecta idioma desde <html lang>
   - Persiste elección en localStorage
   - Notifica a Google Consent Mode v2 (gtag)
   ═══════════════════════════════════════════════════════ */
(function () {
  var STORAGE_KEY = 'caloriascan_cookie_consent_v1';
  var lang = (document.documentElement.lang || 'es').toLowerCase().slice(0, 2);
  var isES = lang !== 'en';

  var copy = isES ? {
    title: 'Usamos cookies',
    body: 'Usamos cookies propias y de Google Ads para medir el rendimiento del sitio y personalizar anuncios. Puedes aceptar todas, rechazarlas o aceptar solo las necesarias para que el sitio funcione. Lee nuestra <a href="/privacy-policy.html">Política de Privacidad</a>.',
    accept: 'Aceptar todo',
    necessary: 'Solo necesarias',
    reject: 'Rechazar todo'
  } : {
    title: 'We use cookies',
    body: 'We use first-party and Google Ads cookies to measure site performance and personalize ads. You can accept all, reject them, or accept only the ones needed for the site to work. Read our <a href="/privacy-policy.html">Privacy Policy</a>.',
    accept: 'Accept all',
    necessary: 'Necessary only',
    reject: 'Reject all'
  };

  // Si el usuario ya eligió, reaplicamos su consentimiento y salimos.
  var stored = null;
  try { stored = JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch (e) {}
  if (stored && stored.choice) {
    applyConsent(stored.choice);
    return;
  }

  // Inyecta CSS
  var css = '\
#cs-cookie-banner{position:fixed;left:16px;right:16px;bottom:16px;z-index:99999;\
background:rgba(255,255,255,0.96);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);\
border:1px solid rgba(0,71,171,0.18);border-radius:18px;\
box-shadow:0 18px 60px rgba(0,71,171,0.18),0 4px 16px rgba(0,0,0,0.08);\
padding:20px 22px;max-width:560px;margin-left:auto;margin-right:auto;\
font-family:"DM Sans",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;\
color:#1a1a2e;line-height:1.5;font-size:14px;\
animation:csSlide .35s cubic-bezier(.2,.9,.3,1.2) both}\
@keyframes csSlide{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}\
#cs-cookie-banner .cs-title{font-weight:700;font-size:15px;color:#0047AB;margin-bottom:6px;letter-spacing:-.01em}\
#cs-cookie-banner .cs-body{font-size:13px;color:#3a3a4e;margin-bottom:14px}\
#cs-cookie-banner .cs-body a{color:#0047AB;text-decoration:underline;text-underline-offset:2px}\
#cs-cookie-banner .cs-actions{display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end}\
#cs-cookie-banner button{font-family:inherit;font-size:13px;font-weight:600;border-radius:10px;\
padding:9px 14px;cursor:pointer;border:1px solid transparent;transition:all .18s ease;letter-spacing:-.005em}\
#cs-cookie-banner .cs-accept{background:#0047AB;color:#fff;border-color:#0047AB}\
#cs-cookie-banner .cs-accept:hover{background:#003a8c;transform:translateY(-1px);box-shadow:0 6px 18px rgba(0,71,171,0.28)}\
#cs-cookie-banner .cs-necessary{background:#fff;color:#0047AB;border-color:rgba(0,71,171,0.35)}\
#cs-cookie-banner .cs-necessary:hover{background:rgba(0,71,171,0.06)}\
#cs-cookie-banner .cs-reject{background:transparent;color:#6b6b7e;border-color:rgba(107,107,126,0.25)}\
#cs-cookie-banner .cs-reject:hover{color:#1a1a2e;border-color:rgba(107,107,126,0.5)}\
@media (max-width:480px){\
#cs-cookie-banner{left:8px;right:8px;bottom:8px;padding:16px 16px;border-radius:14px}\
#cs-cookie-banner .cs-actions{flex-direction:column-reverse}\
#cs-cookie-banner button{width:100%;padding:12px 14px}\
}';
  var style = document.createElement('style');
  style.id = 'cs-cookie-banner-style';
  style.appendChild(document.createTextNode(css));
  document.head.appendChild(style);

  // Inyecta banner
  var banner = document.createElement('div');
  banner.id = 'cs-cookie-banner';
  banner.setAttribute('role', 'dialog');
  banner.setAttribute('aria-live', 'polite');
  banner.setAttribute('aria-label', copy.title);
  banner.innerHTML =
    '<div class="cs-title">' + copy.title + '</div>' +
    '<div class="cs-body">' + copy.body + '</div>' +
    '<div class="cs-actions">' +
      '<button type="button" class="cs-reject" data-choice="reject">' + copy.reject + '</button>' +
      '<button type="button" class="cs-necessary" data-choice="necessary">' + copy.necessary + '</button>' +
      '<button type="button" class="cs-accept" data-choice="accept">' + copy.accept + '</button>' +
    '</div>';

  function mount() {
    if (!document.body) {
      document.addEventListener('DOMContentLoaded', mount);
      return;
    }
    document.body.appendChild(banner);
    banner.addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-choice]');
      if (!btn) return;
      var choice = btn.getAttribute('data-choice');
      saveAndApply(choice);
      banner.remove();
    });
  }
  mount();

  function saveAndApply(choice) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        choice: choice,
        ts: new Date().toISOString()
      }));
    } catch (e) {}
    applyConsent(choice);
  }

  function applyConsent(choice) {
    // "necessary" y "reject" se tratan igual: nada de tracking publicitario.
    var granted = choice === 'accept';
    if (typeof window.gtag !== 'function') {
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { window.dataLayer.push(arguments); };
    }
    window.gtag('consent', 'update', {
      ad_storage: granted ? 'granted' : 'denied',
      ad_user_data: granted ? 'granted' : 'denied',
      ad_personalization: granted ? 'granted' : 'denied',
      analytics_storage: granted ? 'granted' : 'denied'
    });
  }

  // Helper público para reabrir banner desde un link "Cambiar preferencias"
  window.caloriascanResetCookieConsent = function () {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    location.reload();
  };
})();
