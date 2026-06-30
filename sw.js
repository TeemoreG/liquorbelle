// ============================================
// LIQUORBELLE — DYNAMIC SERVICE WORKER
// Works on GitHub Pages (/liquorbelle/) AND custom domain (/)
// ============================================

const CACHE_NAME = 'liquorbelle-v3';

// --- AUTO-DETECT BASE PATH ---
// If SW is at /liquorbelle/sw.js  -> BASE_PATH = '/liquorbelle/'
// If SW is at /sw.js             -> BASE_PATH = '/'
const BASE_PATH = self.location.pathname.replace('sw.js', '');

console.log('[SW] Base Path detected:', BASE_PATH);

// --- BUILD ASSET LIST DYNAMICALLY ---
const STATIC_PAGES = [
  'index.html',
  'shop.html',
  'checkout.html',
  'product-details.html',
  'track-orders.html',
  'admin-full.html',
  'admin-orders.html',
  'manifest.json',
];

const STATIC_ASSETS = [
  BASE_PATH, // The root of the site (e.g., /liquorbelle/ or /)
  ...STATIC_PAGES.map(page => BASE_PATH + page),
];

console.log('[SW] Caching assets:', STATIC_ASSETS);

// ============================================
// INSTALL
// ============================================
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets...');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Install complete. Skipping wait...');
        return self.skipWaiting();
      })
      .catch((err) => {
        console.error('[SW] Install failed:', err);
      })
  );
});

// ============================================
// ACTIVATE
// ============================================
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => {
        return Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => {
              console.log('[SW] Deleting old cache:', key);
              return caches.delete(key);
            })
        );
      })
      .then(() => {
        console.log('[SW] Activated. Claiming clients...');
        return self.clients.claim();
      })
  );
});

// ============================================
// FETCH
// ============================================
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const request = event.request;

  // --- 1. BACKEND API (stale-while-revalidate) ---
  // Catches your Render API calls (any path starting with /api/)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return fetch(request)
          .then((networkResponse) => {
            // Cache the fresh response for next time
            cache.put(request, networkResponse.clone());
            console.log('[SW] API: Network response cached');
            return networkResponse;
          })
          .catch(() => {
            // Network failed — serve from cache
            return cache.match(request).then((cached) => {
              if (cached) {
                console.log('[SW] API: Served from cache');
                return cached;
              }
              // No cache available
              console.warn('[SW] API: No cache, no network');
              return new Response(
                JSON.stringify({ success: false, message: 'Offline' }),
                { status: 503, headers: { 'Content-Type': 'application/json' } }
              );
            });
          });
      })
    );
    return;
  }

  // --- 2. CLOUDINARY IMAGES (cache-first) ---
  if (url.hostname === 'res.cloudinary.com') {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) {
          console.log('[SW] Image: Served from cache');
          return cached;
        }
        return fetch(request)
          .then((networkResponse) => {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, clone);
              console.log('[SW] Image: Cached');
            });
            return networkResponse;
          })
          .catch(() => {
            // Fallback: transparent 1x1 pixel
            return new Response(
              'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
              { status: 200, headers: { 'Content-Type': 'image/gif' } }
            );
          });
      })
    );
    return;
  }

  // --- 3. LOCAL STATIC ASSETS (cache-first) ---
  // Check if the requested file is one of our HTML/JS/CSS assets
  const isLocalAsset = STATIC_ASSETS.some((asset) => {
    return url.pathname === asset || url.pathname === asset + '/';
  });

  if (isLocalAsset) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) {
          console.log('[SW] Static: Served from cache');
          return cached;
        }
        return fetch(request)
          .then((networkResponse) => {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, clone);
              console.log('[SW] Static: Cached');
            });
            return networkResponse;
          })
          .catch(() => {
            // If a page fails, serve the homepage as fallback
            console.warn('[SW] Static: Fallback to index');
            return caches.match(BASE_PATH + 'index.html');
          });
      })
    );
    return;
  }

  // --- 4. EVERYTHING ELSE (network-first) ---
  // Fonts, external scripts, etc.
  event.respondWith(
    fetch(request)
      .catch(() => {
        console.log('[SW] Network failed. Trying cache...');
        return caches.match(request);
      })
  );
});