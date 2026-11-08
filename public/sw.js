// Service Worker Minimal untuk PWA Ojek-O
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Langsung aktifkan SW baru
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim()); // Ambil kendali atas halaman
});

// Tangkap event fetch (wajib ada agar browser menganggap ini PWA yang valid)
self.addEventListener('fetch', (event) => {
  // Biarkan kosong, kita tidak menggunakan caching offline untuk saat ini
});