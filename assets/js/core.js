(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.WeddingCore = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const attendanceOptions = ['Hadir', 'Tidak Hadir'];
  function guestName(search) {
    const p = new URLSearchParams(search);
    return (p.get('to') || p.get('u') || '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 100);
  }
  function inviteUrl(base, name) {
    const url = new URL(base);
    if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Alamat web harus http atau https.');
    url.search = ''; url.hash = '';
    url.searchParams.set('to', name.trim().slice(0, 100));
    return url.href;
  }
  function calendarStamp(value) {
    return new Date(value).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  }
  function escapeICS(value) {
    return String(value).replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
  }
  function foldICS(line) {
    let result = '', column = 0;
    for (const ch of line) {
      const bytes = new TextEncoder().encode(ch).length;
      if (column + bytes > 74) { result += '\r\n '; column = 1; }
      result += ch; column += bytes;
    }
    return result;
  }
  function calendarFile(event, couple, siteUrl, now = new Date()) {
    // Jam selesai belum diberikan: DTSTART saja, jangan mengarang durasi acara.
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Nia Muhadar//Undangan//ID',
      'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'BEGIN:VEVENT',
      'UID:' + event.id + '-2026@webniawedding.vercel.app',
      'DTSTAMP:' + calendarStamp(now), 'DTSTART:' + calendarStamp(event.start),
      'SUMMARY:' + escapeICS(event.title + ' — ' + couple),
      'LOCATION:' + escapeICS(event.location),
      'DESCRIPTION:' + escapeICS('Pukul 10.00 WIB s/d selesai. Waktu selesai mengikuti rangkaian acara.\n' + siteUrl),
      'URL:' + siteUrl, 'END:VEVENT', 'END:VCALENDAR'];
    return lines.map(foldICS).join('\r\n') + '\r\n';
  }
  function googleCalendarUrl(event, couple, siteUrl) {
    const url = new URL('https://calendar.google.com/calendar/render');
    const start = calendarStamp(event.start);
    url.search = new URLSearchParams({action:'TEMPLATE',text:event.title + ' — ' + couple,
      dates:start + '/' + start, ctz:'Asia/Jakarta', location:event.location,
      details:'Pukul 10.00 WIB s/d selesai. Waktu selesai mengikuti rangkaian acara.\n' + siteUrl}).toString();
    return url.href;
  }
  function validateWish(data) {
    if (!data || typeof data !== 'object') throw new Error('Data ucapan tidak valid.');
    const nama = String(data.nama || '').trim(), ucapan = String(data.ucapan || '').trim();
    if (!nama || nama.length > 100) throw new Error('Nama wajib diisi, maksimal 100 karakter.');
    if (!ucapan || ucapan.length > 1000) throw new Error('Ucapan wajib diisi, maksimal 1.000 karakter.');
    const akad = data.acara && data.acara.akad, mantu = data.acara && data.acara.mantu;
    if (!attendanceOptions.includes(akad) || !attendanceOptions.includes(mantu)) throw new Error('Pilih kehadiran untuk kedua acara.');
    if (!/^[a-zA-Z0-9_-]{16,80}$/.test(data.requestId || '')) throw new Error('ID pengiriman tidak valid. Muat ulang halaman.');
    return {nama, ucapan, acara:{akad, mantu}, requestId:data.requestId,
      kehadiran:akad === 'Hadir' || mantu === 'Hadir' ? 'Hadir' : 'Tidak Hadir'};
  }
  function countdown(start, now = Date.now()) {
    const seconds = Math.max(0, Math.floor((new Date(start).getTime() - now) / 1000));
    return {days:Math.floor(seconds / 86400), hours:Math.floor(seconds / 3600) % 24,
      minutes:Math.floor(seconds / 60) % 60, seconds:seconds % 60, ended:seconds === 0};
  }
  return {guestName, inviteUrl, calendarFile, googleCalendarUrl, validateWish, countdown};
});
