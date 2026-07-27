// ============================================
// LIQUORBELLE — SERVICE WORKER v8
// ============================================

const CACHE_NAME = 'liquorbelle-v8.0.1';
const BASE_PATH = self.location.pathname.replace('sw.js', '');
const API_BASE = 'https://liquorbelle-mpesa-backend.onrender.com';

console.log('[SW] Version:', CACHE_NAME);
console.log('[SW] Base Path:', BASE_PATH);

// ============================================
// STATIC ASSETS TO CACHE
// ============================================
const STATIC_PAGES = [
  'index.html',
  'shop.html',
  'checkout.html',
  'product-details.html',
  'accounts.html',
  'login.html',
  'signup.html',
  'profile.html',
  'style.css',
  'app.js',
  'manifest.json',
];

const STATIC_ASSETS = STATIC_PAGES.map(page => BASE_PATH + page);

// ============================================
// INSTALL - Cache everything
// ============================================
self.addEventListener('install', (event) => {
  console.log('[SW] Installing... Version:', CACHE_NAME);
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets...');

        // Cache HTML pages
        const htmlPromises = STATIC_ASSETS.map(url =>
          cache.add(url).catch(err => {
            console.warn('[SW] Failed to cache:', url, err.message);
          })
        );

        // Fetch and cache ALL product images from database
        const imagePromises = fetch(API_BASE + '/api/db/products')
          .then(res => res.json())
          .then(data => {
            if (data.success && data.products) {
              const imageUrls = data.products
                .filter(p => p.image)
                .map(p => p.image)
                .filter(url => url && url.includes('cloudinary.com'));
              
              console.log('[SW] Found', imageUrls.length, 'product images to cache');
              
              return Promise.all(imageUrls.map(url =>
                fetch(url, { mode: 'no-cors' })
                  .then(response => {
                    if (response && response.ok) {
                      cache.put(url, response);
                      console.log('[SW] ✓ Cached image:', url.split('/').pop());
                    }
                  })
                  .catch(() => {})
              ));
            }
          })
          .catch(() => {
            console.warn('[SW] Could not fetch products, will cache on-demand');
          });

        return Promise.all([...htmlPromises, imagePromises])
          .then(() => {
            console.log('[SW] All assets cached successfully!');
            return self.skipWaiting();
          });
      })
  );
});

// ============================================
// ACTIVATE - Clean old caches
// ============================================
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating... Version:', CACHE_NAME);
  
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
  const request = event.request;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    event.respondWith(fetch(request));
    return;
  }

  // --- CLOUDINARY IMAGES (cache-first) ---
  if (url.hostname === 'res.cloudinary.com') {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) {
          return cached;
        }
        return fetch(request)
          .then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, clone);
              });
            }
            return response;
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

  // --- API REQUESTS (stale-while-revalidate) ---
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return fetch(request)
          .then((response) => {
            if (response.ok) {
              cache.put(request, response.clone());
            }
            return response;
          })
          .catch(() => {
            return cache.match(request).then((cached) => {
              if (cached) {
                console.log('[SW] API served from cache:', url.pathname);
                return cached;
              }
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

  // --- LOCAL STATIC ASSETS (cache-first) ---
  const isLocalAsset = STATIC_ASSETS.some((asset) => {
    return url.pathname === asset || url.pathname === asset + '/';
  });

  if (isLocalAsset) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) {
          return cached;
        }
        return fetch(request)
          .then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, clone);
              });
            }
            return response;
          })
          .catch(() => {
            return caches.match(BASE_PATH + 'index.html');
          });
      })
    );
    return;
  }

  // --- EVERYTHING ELSE (network-first) ---
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok && request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, clone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(request);
      })
  );
});

// ============================================
// MESSAGE HANDLER - Force update
// ============================================
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CHECK_FOR_UPDATE') {
    console.log('[SW] Update check requested');
    self.skipWaiting();
  }
});

console.log('[SW] Service Worker ready!');