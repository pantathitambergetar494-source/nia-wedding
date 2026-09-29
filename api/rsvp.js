'use strict';
const Core = require('../assets/js/core.js');
const DEFAULT_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwPQ_F66QuVLe8AOqdMPGf_lvk3cdtcebwL1ByuBuxjU2JQqiwHggwP6DayLIufoudZPg/exec';

function createHandler(fetchImpl = globalThis.fetch, endpoint = process.env.GOOGLE_SCRIPT_URL || DEFAULT_SCRIPT_URL) {
  return async function handler(req, res) {
    res.setHeader('Cache-Control','no-store, max-age=0');
    res.setHeader('Content-Type','application/json; charset=utf-8');
    res.setHeader('X-Content-Type-Options','nosniff');
    const send = (code, data) => res.status(code).json(data);
    const fail = (code, message, retrySafe = false) => send(code,{status:'error',message,retrySafe});
    if (!['GET','POST'].includes(req.method)) { res.setHeader('Allow','GET, POST');return fail(405,'Metode tidak didukung.',true); }
    if (!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(endpoint)) return fail(503,'Layanan ucapan belum dikonfigurasi.',true);
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(),22000);
    async function upstream(params, body) {
      const url = new URL(endpoint);Object.entries(params).forEach(([k,v]) => url.searchParams.set(k,v));
      const response = await fetchImpl(url,{method:body ? 'POST' : 'GET',redirect:'follow',cache:'no-store',signal:controller.signal,
        ...(body ? {headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(body)} : {})});
      if (!response.ok) throw new Error('UPSTREAM_HTTP');
      let data;try { data = await response.json(); } catch (_) { throw new Error('UPSTREAM_JSON'); }
      return data;
    }
    try {
      const query = new URL(req.url,'https://local.invalid').searchParams;
      if (req.method === 'GET') {
        const action = query.get('action') === 'receipt' ? 'receipt' : 'list';
        const id = query.get('id') || '';
        if (action === 'receipt' && !/^[a-zA-Z0-9_-]{16,80}$/.test(id)) return fail(400,'ID pengiriman tidak valid.',true);
        const data = await upstream({api:'2',action,...(action === 'receipt' ? {id} : {})});
        // Legacy Apps Script can still display old wishes; writes require v2.
        if (Array.isArray(data) && action === 'list') return send(200,{status:'success',version:1,data:data.slice(0,200),stats:{comments:data.length},truncated:data.length>200});
        if (data.status !== 'success' || data.version !== 2) return fail(503,'Layanan ucapan sedang disiapkan. Silakan coba lagi nanti.',true);
        return send(200,data);
      }
      const origin = req.headers.origin;
      if (origin && new URL(origin).host !== req.headers.host) return fail(403,'Kirim ucapan melalui halaman undangan.',true);
      if (!String(req.headers['content-type'] || '').startsWith('application/json')) return fail(415,'Format pengiriman tidak valid.',true);
      if (Number(req.headers['content-length'] || 0) > 12000) return fail(413,'Ucapan terlalu panjang.',true);
      let body;
      try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; }
      catch (_) { return fail(400,'Data pengiriman tidak valid.',true); }
      if (JSON.stringify(body || {}).length > 12000) return fail(413,'Ucapan terlalu panjang.',true);
      if (body?.website) return fail(400,'Pengiriman tidak dapat diproses.',true);
      let validated;
      try { validated = Core.validateWish(body); } catch (error) { return fail(400,error.message,true); }
      // Stop before writing if the owner has not deployed the compatible script.
      const health = await upstream({api:'2',action:'health'});
      if (health.status !== 'success' || health.version !== 2) return fail(503,'Layanan konfirmasi sedang disiapkan. Silakan coba lagi nanti.',true);
      const data = await upstream({api:'2'},validated);
      if (data.status === 'error') return fail(data.code === 'CONFLICT' ? 409 : 400,data.message || 'Ucapan belum dapat disimpan.',data.retrySafe === true);
      if (data.status !== 'success' || data.version !== 2 || data.requestId !== validated.requestId || data.saved !== true) throw new Error('UNCONFIRMED');
      return send(200,data);
    } catch (_) {
      // A timeout can occur after appendRow: never claim failure or retry blindly.
      return fail(502,'Status pengiriman belum dapat dikonfirmasi. Periksa status atau coba lagi dengan ID yang sama.');
    } finally { clearTimeout(timer); }
  };
}
module.exports = createHandler();
module.exports.createHandler = createHandler;
