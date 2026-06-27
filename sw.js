// ============================================
// LiquorBelle Service Worker
// ============================================
const CACHE_NAME = 'liquorbelle-v2';
const API_BASE = 'https://liquorbelle-mpesa-backend.onrender.com';

// Static assets to cache on install
// Note: we only cache our own HTML files; CDN assets (fonts, icons) are loaded from the network
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/shop.html',
  '/checkout.html',
  '/product-details.html',
  '/track-orders.html',
  '/admin-full.html',
  '/admin-orders.html',
  '/manifest.json',
  // Add any other local assets (CSS/JS if you host them locally)
];

// ============================================
// INSTALL
// ============================================
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Install complete, skipping waiting');
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
        console.log('[SW] Now controlling all clients');
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

  // ---- 1. PRODUCT API (stale-while-revalidate) ----
  if (url.pathname === '/api/db/products') {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return fetch(request)
          .then((networkResponse) => {
            // Cache the fresh response for next time
            cache.put(request, networkResponse.clone());
            console.log('[SW] API: network response cached');
            return networkResponse;
          })
          .catch(() => {
            // Network failed – serve from cache
            return cache.match(request).then((cached) => {
              if (cached) {
                console.log('[SW] API: served from cache');
                return cached;
              }
              // If no cache, return a fallback empty response
              console.log('[SW] API: no cache, no network – fallback');
              return new Response(JSON.stringify({ success: false, products: [] }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
              });
            });
          });
      })
    );
    return;
  }

  // ---- 2. CLOUDINARY IMAGES (cache-first, fallback to network) ----
  if (url.hostname === 'res.cloudinary.com') {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) {
          console.log('[SW] Image: served from cache');
          return cached;
        }
        return fetch(request)
          .then((networkResponse) => {
            // Cache the image for future use
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, clone);
              console.log('[SW] Image: cached');
            });
            return networkResponse;
          })
          .catch(() => {
            // Return a tiny transparent pixel if image fails
            return new Response(
              'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
              { status: 200, headers: { 'Content-Type': 'image/gif' } }
            );
          });
      })
    );
    return;
  }

  // ---- 3. STATIC ASSETS (cache-first) ----
  // For our own HTML/JS/CSS files, serve from cache if available
  const isLocalAsset = STATIC_ASSETS.some((asset) => {
    return url.pathname === asset || url.pathname === asset + '/';
  });

  if (isLocalAsset) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) {
          console.log('[SW] Static: served from cache');
          return cached;
        }
        return fetch(request)
          .then((networkResponse) => {
            // Cache for next time
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, clone);
              console.log('[SW] Static: cached');
            });
            return networkResponse;
          })
          .catch(() => {
            console.log('[SW] Static: fallback to offline page');
            return caches.match('/index.html');
          });
      })
    );
    return;
  }

  // ---- 4. EVERYTHING ELSE (network-first) ----
  // Google Fonts, Phosphor icons, etc.
  event.respondWith(
    fetch(request)
      .catch(() => {
        return caches.match(request);
      })
  );
});

// ============================================
// OFFLINE FALLBACK – if you want a dedicated offline page
// ============================================
// Uncomment if you create an offline.html page
/*
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match('/offline.html');
    })
  );
});
*/