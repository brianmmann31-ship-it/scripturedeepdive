// ══ SCRIPTURE DEEP DIVE — Service Worker ══
const CACHE_NAME = 'sdd-v1';
const SHELL = [
  '/',
  '/index.html',
  'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Lora:ital,wght@0,400;0,500;1,400&display=swap',
];

// ── Install: cache app shell ──
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: clean up old caches ──
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ── Fetch strategy ──
// • App shell (HTML/fonts): Cache-first with network fallback
// • API calls (Gemini, Supabase, Bible API): Network-only (never cache)
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Never intercept AI or external API calls
  const isApi =
    url.hostname.includes('generativelanguage.googleapis.com') ||
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('bolls.life') ||
    url.hostname.includes('api.groq.com') ||
    url.hostname.includes('openrouter.ai');

  if (isApi) return; // let browser handle normally

  // For navigation requests (page loads): network-first, fallback to cache
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          // Update cache with fresh copy
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // For everything else (fonts, assets): cache-first
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => cached);
    })
  );
});
