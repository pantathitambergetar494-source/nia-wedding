/* Ubah informasi acara di sini. Jangan menaruh token/rahasia di file publik ini. */
window.WEDDING_CONFIG = Object.freeze({
  siteUrl: 'https://niaweddingapp.vercel.app/',
  apiUrl: '/api/rsvp',
  couple: 'Nia & Muhadar',
  events: [
    {
      id: 'akad', title: 'Akad Nikah & Resepsi',
      start: '2026-10-29T10:00:00+07:00',
      dateLabel: 'Kamis, 29 Oktober 2026',
      location: 'Tanjong Glumpang, Kec. Baktiya, Kab. Aceh Utara',
      mapUrl: 'https://maps.google.com/?cid=15361969624675223487',
      exactPin: true
    },
    {
      id: 'mantu', title: 'Ngunduh Mantu',
      start: '2026-11-24T10:00:00+07:00',
      dateLabel: 'Selasa, 24 November 2026',
      location: 'Bungong, Kec. Syamtalira Bayu',
      // Ganti dengan tautan pin rumah/gedung dari pemilik acara, lalu exactPin: true.
      mapUrl: 'https://maps.google.com/?q=Bungong+Syamtalira+Bayu',
      exactPin: false
    }
  ]
});
