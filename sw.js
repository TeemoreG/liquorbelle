// ============================================
// LIQUORBELLE — DYNAMIC SERVICE WORKER
// Works on GitHub Pages (/liquorbelle/) AND custom domain (/)
// ============================================

const CACHE_NAME = 'liquorbelle-v3';

// --- AUTO-DETECT BASE PATH ---
const BASE_PATH = self.location.pathname.replace('sw.js', '');
console.log('[SW] Base Path detected:', BASE_PATH);

// --- BUILD ASSET LIST DYNAMICALLY ---
// Only cache the HTML files we know exist (no manifest.json)
const STATIC_PAGES = [
  'index.html',
  'shop.html',
  'checkout.html',
  'product-details.html',
  'track-orders.html',
  'admin-full.html',
  'admin-orders.html',
];

// We explicitly add BASE_PATH + each page
const STATIC_ASSETS = STATIC_PAGES.map(page => BASE_PATH + page);

// Optionally add the root path if you want to cache the directory index
// But it's often safer to just cache the HTML files directly.
// STATIC_ASSETS.push(BASE_PATH); // Uncomment if you want to cache /liquorbelle/

console.log('[SW] Caching assets:', STATIC_ASSETS);

// ============================================
// INSTALL
// ============================================
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets...');
        // Use cache.addAll with a catch for each request to avoid failing the whole install
        return Promise.all(
          STATIC_ASSETS.map(url =>
            cache.add(url).catch(err => {
              console.warn('[SW] Failed to cache:', url, err);
            })
          )
        );
      })
      .then(() => {
        console.log('[SW] Install complete. Skipping wait...');
        return self.skipWaiting();
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
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return fetch(request)
          .then((networkResponse) => {
            cache.put(request, networkResponse.clone());
            console.log('[SW] API: Network response cached');
            return networkResponse;
          })
          .catch(() => {
            return cache.match(request).then((cached) => {
              if (cached) {
                console.log('[SW] API: Served from cache');
                return cached;
              }
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
            console.warn('[SW] Static: Fallback to index');
            return caches.match(BASE_PATH + 'index.html');
          });
      })
    );
    return;
  }

  // --- 4. EVERYTHING ELSE (network-first) ---
  event.respondWith(
    fetch(request)
      .catch(() => {
        console.log('[SW] Network failed. Trying cache...');
        return caches.match(request);
      })
  );
});