(function () {
  'use strict';
  const C = window.WEDDING_CONFIG, Core = window.WeddingCore;
  if (!C || !Core) return;
  const $ = id => document.getElementById(id);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const storageKey = 'nia-muhadar-pending-v2';
  let toastTimer, opened = false, introTimer, openedAt = 0;
  let activeCalendar = C.events[0], galleryIndex = 0, galleryReturnFocus;
  let pending = null, sending = false, compatible = false, wishes = [], visibleWishes = 8;
  let latestLoad = 0;
  let startMotion = () => {}, motionStarted = false, heroRevealed = false, heroInView = true;
  const form = $('comment-form'), submit = $('submit-wish'), fields = ['author','comment-msg','attendance-akad','attendance-mantu'];

  function notify(message) {
    $('toast').textContent = message; $('toast').hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { $('toast').hidden = true; }, 4200);
  }
  function formStatus(text, state = '') {
    $('form-status').textContent = text; $('form-status').dataset.state = state;
  }
  function rememberPending(value) {
    pending = value;
    try { if (value) localStorage.setItem(storageKey, JSON.stringify(value)); else localStorage.removeItem(storageKey); } catch (_) {}
  }
  function setFormBusy(busy) {
    sending = busy;
    fields.forEach(id => { $(id).disabled = busy || !!pending; });
    submit.disabled = busy;
    submit.textContent = busy ? 'Mengirim…' : pending ? 'Coba kirim lagi' : 'Kirim Ucapan';
    $('check-receipt').hidden = !pending;
    $('check-receipt').disabled = busy;
    form.setAttribute('aria-busy', String(busy));
  }
  function revealHero(useStill = false) {
    clearTimeout(introTimer);
    const hero = $('beranda');
    heroRevealed = true;
    hero.classList.remove('intro-running');
    hero.classList.toggle('intro-revealed', heroInView);
    $('hero-content').inert = false;
    const skippedFocus = document.activeElement === $('skip-intro');
    $('intro-tools').hidden = true;
    if (useStill) { $('gate-video').pause(); $('gate-video').hidden = true; }
    if (skippedFocus) $('hero-content').querySelector('button').focus({preventScroll:true});
  }
  function watchIntro() {
    clearTimeout(introTimer);
    introTimer = setTimeout(() => revealHero(true), 8000);
  }
  function updateAudio() {
    const audio = $('bg-audio'), playing = !audio.paused && !audio.ended;
    $('audio-toggle').setAttribute('aria-pressed', String(playing));
    const label = playing ? 'Jeda musik: Shape of My Heart — Backstreet Boys' : 'Putar musik: Shape of My Heart — Backstreet Boys';
    $('audio-toggle').setAttribute('aria-label', label); $('audio-label').textContent = label;
  }
  async function playAudio(manual = false) {
    try { await $('bg-audio').play(); } catch (_) { if (manual) notify('Musik belum bisa diputar. Coba lagi setelah koneksi stabil.'); }
    updateAudio();
  }
  function openInvitation() {
    if (opened) return; opened = true; openedAt = Date.now();
    document.body.classList.remove('cover-open');
    $('invitation').inert = false; $('bottom-nav').inert = false;
    $('cover').inert = true; $('cover').classList.add('is-leaving');
    setTimeout(() => { $('cover').hidden = true; }, reduceMotion.matches ? 0 : 650);
    $('audio-toggle').hidden = false;
    startMotion();
    // Play inside the click gesture, before awaits, for mobile audio policies.
    playAudio();
    if (reduceMotion.matches) { revealHero(true); return; }
    const video = $('gate-video');
    $('beranda').classList.add('intro-running');
    $('hero-content').inert = true; $('intro-tools').hidden = false;
    video.hidden = false; video.muted = true; video.playsInline = true;
    watchIntro();
    try {
      const promise = video.play();
      if (promise && promise.catch) promise.catch(() => revealHero(true));
    } catch (_) { revealHero(true); }
    $('skip-intro').focus({preventScroll:true});
  }
  function setupIntro() {
    const video = $('gate-video');
    $('open-invitation').addEventListener('click', openInvitation);
    $('skip-intro').addEventListener('click', () => { revealHero(true); $('hero-content').querySelector('button').focus({preventScroll:true}); });
    video.addEventListener('playing', () => { $('intro-status').textContent = 'Selamat datang'; watchIntro(); });
    video.addEventListener('waiting', watchIntro);
    video.addEventListener('timeupdate', () => { if (opened && video.currentTime >= 4.6) revealHero(); });
    video.addEventListener('ended', () => revealHero(true));
    video.addEventListener('error', () => { if (opened) revealHero(true); });
    video.querySelector('source').addEventListener('error', () => { if (opened) revealHero(true); });
    if (reduceMotion.addEventListener) reduceMotion.addEventListener('change', event => { if (event.matches && opened) revealHero(true); });
    $('audio-toggle').addEventListener('click', () => { if ($('bg-audio').paused) playAudio(true); else $('bg-audio').pause(); });
    ['play','pause','ended','error'].forEach(name => $('bg-audio').addEventListener(name, updateAudio));
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { $('bg-audio').pause(); if (opened && !video.paused) revealHero(true); }
    });
    // Warm up the small muted video; never autoplay behind the invitation cover.
    const warm = () => { if (!opened && !reduceMotion.matches && !navigator.connection?.saveData) { video.preload = 'auto'; video.load(); } };
    if ('requestIdleCallback' in window) window.requestIdleCallback(warm, {timeout:2500});
    else setTimeout(warm, 2000);
  }
  function setupMotionAndNav() {
    if ('IntersectionObserver' in window && !reduceMotion.matches) {
      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) entry.target.classList.add('is-visible');
          else entry.target.classList.remove('is-visible');
        });
      }, {threshold:0.1, rootMargin:'0px 0px -8% 0px'});
      const heroObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          heroInView = entry.isIntersecting;
          if (heroRevealed) entry.target.classList.toggle('intro-revealed', heroInView);
        });
      }, {threshold:0});
      // Start only after opening; keep observing so entrance effects can replay.
      startMotion = () => {
        if (motionStarted) return;
        motionStarted = true;
        const reveals = [...document.querySelectorAll('.reveal')];
        reveals.forEach(el => el.classList.remove('is-visible'));
        document.body.classList.add('motion-ready');
        // Paint the hidden state first so the browser cannot skip the transition.
        requestAnimationFrame(() => requestAnimationFrame(() => {
          reveals.forEach(el => observer.observe(el));
          heroObserver.observe($('beranda'));
        }));
      };
    }
    const navLinks = [...$('bottom-nav').querySelectorAll('a')];
    let queued = false;
    const update = () => {
      queued = false;
      const cutoff = window.innerHeight * .42;
      let active = navLinks[0];
      for (const link of navLinks) if (document.querySelector(link.hash).getBoundingClientRect().top <= cutoff) active = link;
      navLinks.forEach(link => { if (link === active) link.setAttribute('aria-current','location'); else link.removeAttribute('aria-current'); });
    };
    window.addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(update); } }, {passive:true});
    update();
    $('bottom-nav').addEventListener('click', () => { if ($('beranda').classList.contains('intro-running')) revealHero(true); });
  }
  function updateCountdown() {
    const now = Date.now();
    const upcoming = C.events.find(event => new Date(event.start).getTime() > now);
    const event = upcoming || C.events[C.events.length - 1];
    const remaining = Core.countdown(event.start, now);
    ['days','hours','minutes','seconds'].forEach(key => { $(key).textContent = String(remaining[key]).padStart(2,'0'); });
    $('countdown-status').textContent = upcoming ? 'Menuju ' + event.title + ' · ' + event.dateLabel : 'Terima kasih atas doa dan kehadiran Anda di hari bahagia kami.';
  }
  function openDialog(dialog) {
    if (typeof dialog.showModal !== 'function') return false;
    dialog.showModal(); document.body.classList.add('modal-open'); return true;
  }
  function setupDialogs() {
    document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => $(button.dataset.close).close()));
    ['gallery-dialog','calendar-dialog'].forEach(id => {
      const dialog = $(id);
      dialog.addEventListener('close', () => { document.body.classList.remove('modal-open'); if (id === 'gallery-dialog' && galleryReturnFocus) galleryReturnFocus.focus({preventScroll:true}); });
      dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
    });
    document.querySelectorAll('[data-calendar]').forEach(button => button.addEventListener('click', () => {
      activeCalendar = C.events.find(event => event.id === button.dataset.calendar);
      if (!activeCalendar) return;
      $('calendar-title').textContent = activeCalendar.title;
      $('calendar-description').textContent = activeCalendar.dateLabel + ' · 10.00 WIB';
      $('google-calendar').href = Core.googleCalendarUrl(activeCalendar, C.couple, C.siteUrl);
      if (!openDialog($('calendar-dialog'))) downloadCalendar();
    }));
    $('download-calendar').addEventListener('click', downloadCalendar);
  }
  function downloadCalendar() {
    const blob = new Blob([Core.calendarFile(activeCalendar, C.couple, C.siteUrl)], {type:'text/calendar;charset=utf-8'});
    const href = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = href; a.download = 'nia-muhadar-' + activeCalendar.id + '.ics';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(href), 30000);
    notify('File kalender diunduh. Buka file untuk menambahkan acara.');
  }
  const gallery = [...document.querySelectorAll('[data-gallery]')];
  function showPhoto(index) {
    galleryIndex = (index + gallery.length) % gallery.length;
    const link = gallery[galleryIndex], image = $('lightbox-image');
    $('gallery-error').hidden = true;
    image.alt = link.querySelector('img').alt; image.src = link.href;
    $('gallery-caption').textContent = image.alt;
    $('gallery-counter').textContent = (galleryIndex + 1) + ' / ' + gallery.length;
    if (!navigator.connection?.saveData) { const next = new Image(); next.src = gallery[(galleryIndex + 1) % gallery.length].href; }
  }
  function setupGallery() {
    gallery.forEach((link, index) => link.addEventListener('click', event => {
      if (typeof $('gallery-dialog').showModal !== 'function') return;
      event.preventDefault(); galleryReturnFocus = link; showPhoto(index); openDialog($('gallery-dialog'));
    }));
    $('gallery-prev').addEventListener('click', () => showPhoto(galleryIndex - 1));
    $('gallery-next').addEventListener('click', () => showPhoto(galleryIndex + 1));
    $('gallery-dialog').addEventListener('keydown', event => { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); showPhoto(galleryIndex + (event.key === 'ArrowLeft' ? -1 : 1)); } });
    $('lightbox-image').addEventListener('error', () => { $('gallery-error').hidden = false; });
    let touchStart;
    $('gallery-dialog').addEventListener('touchstart', event => { touchStart = event.touches.length === 1 ? {x:event.touches[0].clientX,y:event.touches[0].clientY} : null; }, {passive:true});
    $('gallery-dialog').addEventListener('touchend', event => {
      if (!touchStart || event.changedTouches.length !== 1) return;
      const dx = event.changedTouches[0].clientX - touchStart.x, dy = event.changedTouches[0].clientY - touchStart.y;
      if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.4) showPhoto(galleryIndex + (dx < 0 ? 1 : -1));
      touchStart = null;
    }, {passive:true});
  }
  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch (_) {}
    const field = document.createElement('textarea'); field.value = text;
    field.style.cssText = 'position:fixed;left:-9999px;top:0';document.body.appendChild(field);field.select();
    let copied = false;try { copied = document.execCommand('copy'); } catch (_) {}field.remove();return copied;
  }
  async function api(path = '', options = {}, timeoutMs = 40000) {
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(C.apiUrl + path, {...options,signal:controller.signal,cache:'no-store'});
      let data;try { data = await response.json(); } catch (_) { throw new Error('Layanan ucapan belum dapat dihubungi. Coba lagi nanti.'); }
      if (!response.ok || data.status !== 'success') {
        const err = new Error(data.message || 'Ucapan belum dapat diproses.');
        err.definitive = data.retrySafe === true; throw err;
      }
      return data;
    } catch (error) {
      if (error.name === 'AbortError') throw new Error('Koneksi terlalu lama. Status pengiriman belum terkonfirmasi.');
      throw error;
    } finally { clearTimeout(timer); }
  }
  function renderWishes() {
    const container = $('comments-container'); container.replaceChildren();
    wishes.slice(0,visibleWishes).forEach(wish => {
      const card = document.createElement('article'); card.className = 'wish-card';
      const title = document.createElement('h4'); title.textContent = String(wish.nama || 'Tamu');
      const text = document.createElement('p');text.textContent = String(wish.ucapan || '');
      card.append(title,text);
      const badges = document.createElement('div');badges.className = 'wish-badges';
      const entries = wish.acara ? [['Akad',wish.acara.akad],['Mantu',wish.acara.mantu]] : [['',wish.kehadiran]];
      entries.forEach(([label,value]) => { if (!value) return;const badge = document.createElement('span');badge.textContent = (label ? label + ': ' : '') + value; if (value === 'Hadir') badge.className = 'attending';badges.append(badge); });
      card.append(badges);
      const date = new Date(wish.timestamp);
      if (Number.isFinite(date.getTime())) { const time = document.createElement('time');time.dateTime = date.toISOString();time.textContent = new Intl.DateTimeFormat('id-ID',{day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Jakarta'}).format(date);card.append(time); }
      container.append(card);
    });
    $('more-wishes').hidden = visibleWishes >= wishes.length;
    if (!$('more-wishes').hidden) $('more-wishes').textContent = 'Lihat ' + Math.min(8, wishes.length - visibleWishes) + ' ucapan lainnya';
  }
  async function loadWishes(keepFormStatus = false) {
    const loadId = ++latestLoad;
    $('refresh-wishes').disabled = true;
    $('wishes-status').hidden = false; $('wishes-status').textContent = 'Memuat ucapan…';
    try {
      let data;
      try { data = await api(); }
      catch (_) { data = await api('?retry=' + Date.now(),{},40000); }
      if (loadId !== latestLoad) return;
      if (!Array.isArray(data.data)) throw new Error('Daftar ucapan belum dapat dibaca.');
      compatible = data.version === 2;
      wishes = data.data; renderWishes();
      $('total-comments').textContent = String(data.stats?.comments ?? wishes.length);
      $('stat-akad').textContent = data.stats?.akadHadir == null ? '—' : String(data.stats.akadHadir);
      $('stat-mantu').textContent = data.stats?.mantuHadir == null ? '—' : String(data.stats.mantuHadir);
      $('wishes-status').hidden = wishes.length > 0 && !data.truncated;
      $('wishes-status').textContent = data.truncated ? 'Menampilkan 200 ucapan terbaru.' : 'Belum ada ucapan. Jadilah yang pertama memberikan doa terbaik.';
      if (!keepFormStatus && !sending && !pending) formStatus(compatible ? 'Ucapan akan tampil setelah berhasil tersimpan.' : 'Daftar ucapan memakai layanan lama, tapi Anda tetap dapat mencoba mengirim konfirmasi.');
    } catch (error) {
      if (loadId !== latestLoad) return;
      $('wishes-status').hidden = false; $('wishes-status').textContent = (wishes.length ? 'Menampilkan ucapan yang sebelumnya dimuat. ' : '') + 'Gagal memuat pembaruan. Tekan “Muat ulang” untuk mencoba lagi.';
      if (!keepFormStatus && !sending && !pending) formStatus('Layanan belum dapat dihubungi. Silakan muat ulang ucapan.', 'error');
    } finally {
      if (loadId === latestLoad) { $('refresh-wishes').disabled = false; setFormBusy(sending); }
    }
  }
  async function confirmReceipt() {
    if (!pending) return false;
    const receipt = await api('?action=receipt&id=' + encodeURIComponent(pending.requestId),{},18000);
    if (receipt.found === true && receipt.requestId === pending.requestId) { finishWish(); return true; }
    return false;
  }
  function finishWish() {
    rememberPending(null);form.reset();$('author').value = Core.guestName(location.search);updateCharacterCount();
    formStatus('Terima kasih! Ucapan dan konfirmasi kehadiran Anda sudah tersimpan.', 'success');
    notify('Ucapan berhasil tersimpan. Terima kasih!');
    setFormBusy(false); visibleWishes = 8; loadWishes(true);
  }
  function createId() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    if (window.crypto?.getRandomValues) return Array.from(window.crypto.getRandomValues(new Uint8Array(16)),x => x.toString(16).padStart(2,'0')).join('');
    return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  }
  function updateCharacterCount() { $('message-count').textContent = $('comment-msg').value.length + ' / 1.000 karakter'; }
  async function sendWish(event) {
    event.preventDefault(); if (sending) return;
    if (!pending && !form.reportValidity()) return;
    if ($('website').value) { formStatus('Pengiriman tidak dapat diproses.', 'error'); return; }
    try {
      if (!pending) rememberPending(Core.validateWish({requestId:createId(),nama:$('author').value,ucapan:$('comment-msg').value,acara:{akad:$('attendance-akad').value,mantu:$('attendance-mantu').value}}));
    } catch (error) { formStatus(error.message,'error'); return; }
    setFormBusy(true); formStatus('Menyimpan ucapan dan kehadiran…');
    try {
      const data = await api('',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...pending,website:'',elapsedMs:Date.now()-openedAt})});
      if (data.version !== 2 || data.requestId !== pending.requestId || data.saved !== true) throw new Error('Status penyimpanan belum terkonfirmasi.');
      finishWish();
    } catch (error) {
      if (error.definitive) { rememberPending(null);formStatus(error.message, 'error'); }
      else {
        let confirmed = false;try { confirmed = await confirmReceipt(); } catch (_) {}
        if (!confirmed) formStatus('Status pengiriman belum terkonfirmasi. Isi Anda tetap tersimpan di perangkat ini. Periksa status atau coba kirim lagi; kiriman yang sama tidak akan digandakan.', 'error');
      }
    } finally { setFormBusy(false); }
  }
  function restoreDraft() {
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey) || 'null');
      if (stored) {
        pending = Core.validateWish(stored);
        $('author').value = pending.nama; $('comment-msg').value = pending.ucapan;
        $('attendance-akad').value = pending.acara.akad; $('attendance-mantu').value = pending.acara.mantu;
        formStatus('Ada pengiriman sebelumnya yang belum terkonfirmasi. Periksa statusnya atau coba kirim lagi.');
      }
    } catch (_) { rememberPending(null); }
    updateCharacterCount();setFormBusy(false);
  }
  try {
    const name = Core.guestName(location.search);
    if (name) { $('guest-name').textContent = name; $('author').value = name; }
    C.events.forEach(event => {
      const link = document.querySelector('[data-map="' + event.id + '"]');
      if (link && /^https:\/\//.test(event.mapUrl)) {
        link.href = event.mapUrl;
        if (event.id === 'mantu' && event.exactPin) { link.lastChild.textContent = 'Lihat Lokasi'; $('map-note-mantu').hidden = true; }
      }
    });
    setupIntro();setupMotionAndNav();setupDialogs();setupGallery();
    updateCountdown();setInterval(() => { if (!document.hidden) updateCountdown(); },1000);
    $('copy-account').addEventListener('click', async () => { const ok = await copyText($('account-number').textContent);notify(ok ? 'Nomor rekening berhasil disalin.' : 'Penyalinan belum berhasil. Pilih nomor rekening dan salin secara manual.'); });
    $('comment-msg').addEventListener('input', updateCharacterCount);
    form.addEventListener('submit', sendWish);
    $('refresh-wishes').addEventListener('click', () => loadWishes(!!pending || sending));
    $('more-wishes').addEventListener('click', () => { visibleWishes += 8;renderWishes(); });
    $('check-receipt').addEventListener('click', async () => {
      if (sending) return;setFormBusy(true);submit.textContent = 'Memeriksa…';
      try { if (!await confirmReceipt()) formStatus('Ucapan belum tercatat. Tekan “Coba kirim lagi” untuk mengirim ulang dengan aman.'); }
      catch (_) { formStatus('Status belum dapat diperiksa. Coba lagi setelah koneksi stabil.','error'); }
      finally { setFormBusy(false); }
    });
    restoreDraft();loadWishes(!!pending);
    $('cover').hidden = false;document.body.classList.add('cover-open');
    $('invitation').inert = true;$('bottom-nav').inert = true;
  } catch (error) {
    // Progressive enhancement: a failed interactive feature never traps the guest.
    $('cover').hidden = true;document.body.classList.remove('cover-open','motion-ready');
    $('invitation').inert = false;$('bottom-nav').inert = false;
    console.error('Undangan: fitur interaktif gagal disiapkan', error);
  }
})();
