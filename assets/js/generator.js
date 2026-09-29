(function () {
  'use strict';
  const $ = id => document.getElementById(id), Core = window.WeddingCore;
  let entries = [];
  $('base-url').value = window.WEDDING_CONFIG.siteUrl;
  async function copy(text) {
    try { await navigator.clipboard.writeText(text); $('generator-status').textContent = 'Berhasil disalin.'; }
    catch (_) { $('generator-status').textContent = 'Pilih teks yang tersedia, lalu salin secara manual.'; }
  }
  $('generator-form').addEventListener('submit', event => {
    event.preventDefault();
    const names = [...new Set($('guest-list').value.split(/\r?\n/).map(n => n.trim()).filter(Boolean))];
    if (!names.length || names.length > 100 || names.some(n => n.length > 100)) { $('generator-status').textContent = 'Isi 1–100 nama, maksimal 100 karakter per nama.'; return; }
    let generated;
    try {
      generated = names.map((name,index) => {
        const baseInviteUrl = Core.inviteUrl($('base-url').value.trim(), name);
        const urlObj = new URL(baseInviteUrl);
        urlObj.searchParams.set('v', Date.now().toString(36) + '-' + index.toString(36));
        const url = urlObj.toString();
        const message = 'Assalamu’alaikum warahmatullahi wabarakatuh.\n\nKepada Yth. ' + name + '\n\nDengan memohon rahmat dan rida Allah SWT, kami mengundang Bapak/Ibu/Saudara/i untuk hadir dan memberikan doa restu pada pernikahan kami, Nia & Muhadar.\n\nInformasi acara dan konfirmasi kehadiran dapat dilihat melalui undangan berikut:\n' + url + '\n\nMerupakan kebahagiaan bagi kami atas kehadiran dan doa restunya. Terima kasih.\n\nWassalamu’alaikum warahmatullahi wabarakatuh.';
        return {name,url,message};
      });
    } catch (_) { $('generator-status').textContent = 'Masukkan alamat web yang valid, diawali https:// atau http://.';return; }
    entries = generated; $('generated-list').replaceChildren();
    entries.forEach((entry,index) => {
      const article = document.createElement('article');article.className = 'generated-card';
      const title = document.createElement('h2');title.textContent = entry.name;
      const link = document.createElement('a');link.href = entry.url;link.target = '_blank';link.rel = 'noopener noreferrer';link.textContent = entry.url;
      const text = document.createElement('textarea');text.value = entry.message;text.readOnly = true;text.setAttribute('aria-label','Pesan undangan untuk '+entry.name);
      const copyLink = document.createElement('button');copyLink.className = 'button button-dark';copyLink.type = 'button';copyLink.textContent = 'Salin Link';copyLink.addEventListener('click',()=>copy(entry.url));
      const copyMessage = document.createElement('button');copyMessage.className = 'button button-outline';copyMessage.type = 'button';copyMessage.textContent = 'Salin Pesan';copyMessage.addEventListener('click',()=>copy(entry.message));
      article.append(title,link,text,copyLink,copyMessage);$('generated-list').append(article);
    });
    $('generator-status').textContent = entries.length + ' undangan siap disalin.';
    $('copy-all').hidden = false;$('download-csv').hidden = false;
  });
  $('copy-all').addEventListener('click',()=>copy(entries.map(e=>e.name+'\n'+e.url).join('\n\n')));
  $('download-csv').addEventListener('click',()=>{
    const cell = value => '"' + (/^[=+\-@]/.test(value) ? "'" : '') + value.replace(/"/g,'""') + '"';
    const csv = '\ufeffNama,Link\r\n' + entries.map(e=>cell(e.name)+','+cell(e.url)).join('\r\n');
    const href = URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
    const a = document.createElement('a');a.href=href;a.download='daftar-link-undangan.csv';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(href),30000);
  });
})();
