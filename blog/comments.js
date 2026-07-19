(function () {
  var SUPABASE_URL = 'https://cuioliuujsqbegqkflso.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_htI0dbrYP4OU4uw9HMx_fg_L3irJHsL';
  var isEN = document.documentElement.lang === 'en';

  var T = isEN ? {
    empty: 'Be the first to comment.',
    error: 'Something went wrong. Please try again.',
    posting: 'Posting…'
  } : {
    empty: 'Sé el primero en comentar.',
    error: 'Algo salió mal. Intenta de nuevo.',
    posting: 'Publicando…'
  };

  var list = document.getElementById('commentsList');
  var form = document.getElementById('commentForm');
  if (!list || !form) return;

  var nameInput = document.getElementById('commentName');
  var msgInput = document.getElementById('commentMessage');
  var honeypot = document.getElementById('commentWebsite');
  var errorEl = document.getElementById('commentError');
  var submitBtn = document.getElementById('commentSubmit');

  function slugFromPath() {
    var parts = location.pathname.replace(/\/+$/, '').split('/').filter(Boolean);
    var last = (parts[parts.length - 1] || 'index').replace(/\.html$/, '');
    var lang = parts[0] === 'en' ? 'en' : 'es';
    return lang + '-' + last;
  }
  var slug = slugFromPath();

  function esc(s) {
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  function fmtDate(iso) {
    try {
      return new Date(iso).toLocaleDateString(isEN ? 'en-US' : 'es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch (e) {
      return '';
    }
  }

  function commentHTML(c) {
    return '<div class="comment-item">' +
      '<div class="comment-meta"><strong>' + esc(c.name) + '</strong><span>' + esc(fmtDate(c.created_at)) + '</span></div>' +
      '<p class="comment-text">' + esc(c.message) + '</p>' +
      '</div>';
  }

  function showError() {
    errorEl.textContent = T.error;
    errorEl.style.display = 'block';
  }

  function loadComments() {
    fetch(SUPABASE_URL + '/rest/v1/blog_comments?post_slug=eq.' + encodeURIComponent(slug) + '&is_visible=eq.true&order=created_at.desc&select=name,message,created_at', {
      headers: { apikey: SUPABASE_KEY }
    })
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (rows) {
        list.innerHTML = rows.length ? rows.map(commentHTML).join('') : '<p class="comment-empty">' + esc(T.empty) + '</p>';
      })
      .catch(function () { list.innerHTML = ''; });
  }

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    errorEl.style.display = 'none';
    if (honeypot && honeypot.value) return;

    var name = nameInput.value.trim();
    var message = msgInput.value.trim();
    if (!name || !message || name.length > 60 || message.length > 1000) {
      showError();
      return;
    }

    submitBtn.disabled = true;
    var originalLabel = submitBtn.textContent;
    submitBtn.textContent = T.posting;

    fetch(SUPABASE_URL + '/rest/v1/blog_comments', {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        'Content-Type': 'application/json',
        Prefer: 'return=representation'
      },
      body: JSON.stringify({ post_slug: slug, name: name, message: message })
    })
      .then(function (r) { if (!r.ok) throw new Error('insert failed'); return r.json(); })
      .then(function (rows) {
        form.reset();
        var emptyMsg = list.querySelector('.comment-empty');
        if (emptyMsg) emptyMsg.remove();
        list.insertAdjacentHTML('afterbegin', commentHTML(rows[0]));
      })
      .catch(showError)
      .then(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = originalLabel;
      });
  });

  loadComments();
})();
