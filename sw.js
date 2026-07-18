// ============================================
// LIQUORBELLE — FIXED SERVICE WORKER v6
// Fixed: POST request caching error, 403 handling, performance
// ============================================

const CACHE_NAME = 'liquorbelle-v6';
const BASE_PATH = self.location.pathname.replace('sw.js', '');
const API_BASE = 'https://liquorbelle-mpesa-backend.onrender.com';

console.log('[SW] Base Path:', BASE_PATH);

// ============================================
// STATIC ASSETS TO CACHE
// ============================================
const STATIC_PAGES = [
  'index.html',
  'shop.html',
  'checkout.html',
  'product-details.html',
  'track-orders.html',
  'admin-full.html',
  'admin-orders.html',
];

const STATIC_ASSETS = STATIC_PAGES.map(page => BASE_PATH + page);

// ============================================
// PRECACHE IMAGES
// ============================================
const PRECACHE_IMAGES = [
  'https://res.cloudinary.com/dvqjgbdhp/image/upload/f_auto,q_auto,w_120,c_fit/v1781861620/360_F_1968789415_ryoi6Go4jg91plfDJTcIIjSWJoQebHb5_ftjnxo.jpg',
  'https://res.cloudinary.com/dvqjgbdhp/image/upload/f_auto,q_auto,w_120,c_fit/v1782048744/Most-popular-beers-in-Kenya-Guinness_a2ggz6.jpg',
  'https://res.cloudinary.com/dvqjgbdhp/image/upload/f_auto,q_auto,w_120,c_fit/v1782318392/ej-vs-brandy__24539.1752495285.1280.1280__71304.1_bxvpwn.jpg',
  'https://res.cloudinary.com/dvqjgbdhp/image/upload/f_auto,q_auto,w_120,c_fit/v1782318444/a72b554e-5c0b-4ac3-8a66-bdbbf931453c.3c0dcb1f945848aa6629090c307ae781_ksa4md.jpg',
  'https://res.cloudinary.com/dvqjgbdhp/image/upload/f_auto,q_auto,w_120,c_fit/v1782048542/ARZLR-0_rmmte9.jpg',
  'https://res.cloudinary.com/dvqjgbdhp/image/upload/f_auto,q_auto,w_120,c_fit/v1782048367/CHCAS-0_w3c0de.jpg',
  'https://res.cloudinary.com/dvqjgbdhp/image/upload/f_auto,q_auto,w_120,c_fit/v1782318741/What-Is-Drambuie-FT-BLOG0823-a15766cd40da434a8145fe33552e5a9c_i0h8wg.jpg',
  'https://res.cloudinary.com/dvqjgbdhp/image/upload/f_auto,q_auto,w_120,c_fit/v1782318835/Cold_Tea_in_Kenya_600x600_q0ik5i.jpg',
  'https://res.cloudinary.com/dvqjgbdhp/image/upload/f_auto,q_auto,w_120,c_fit/v1782319077/soda_kzknqb.jpg',
  'https://res.cloudinary.com/dvqjgbdhp/image/upload/f_auto,q_auto,w_120,c_fit/v1782319248/keringet-still-water_fykbf3.jpg',
  'https://res.cloudinary.com/dvqjgbdhp/image/upload/v1782476528/Red-Bull-Energy-Drink-80mg-Caffeine-8-4-fl-oz-Can_c9e445f3-1800-40d0-81ab-6b93a9aaacb3.d2f8d87c58e8287c26cae8b3b6d9e38a_snc71g.jpg',
  'https://res.cloudinary.com/dvqjgbdhp/image/upload/f_auto,q_auto,w_120,c_fit/v1782319403/Scene2_fgsgg1.webp',
  'https://res.cloudinary.com/dvqjgbdhp/image/upload/f_auto,q_auto,w_120,c_fit/v1782319473/51PDVK6sQzL._AC_UF1000_1000_QL80__cn0azd.jpg',
  'https://res.cloudinary.com/dvqjgbdhp/image/upload/f_auto,q_auto,w_120,c_fit/v1780905905/WhatsApp_Image_2026-06-04_at_3.41.50_PM_saprsh.jpg',
  'https://res.cloudinary.com/dvqjgbdhp/image/upload/f_auto,q_auto,w_800,c_fit/v1781119164/liqbb_goc41e.png',
  'https://res.cloudinary.com/dvqjgbdhp/image/upload/f_auto,q_auto,w_120,c_fit/v1781875182/Mpesa_bvcz8v.png',
  'https://res.cloudinary.com/dvqjgbdhp/image/upload/v1782462538/af530399-7256-422f-97b7-71496c648bc1_osqga6.png',
];

// ============================================
// INSTALL - FIXED: No POST caching
// ============================================
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets...');

        // Cache HTML pages
        const htmlPromises = STATIC_ASSETS.map(url =>
          cache.add(url).catch(err => {
            console.warn('[SW] Failed to cache:', url, err);
          })
        );

        // Cache images (GET only)
        const imagePromises = PRECACHE_IMAGES.map(url =>
          fetch(url)
            .then(res => {
              if (res.ok) {
                cache.put(url, res);
                console.log('[SW] Cached image:', url);
              }
            })
            .catch(() => {
              console.warn('[SW] Failed to cache image:', url);
            })
        );

        return Promise.all([...htmlPromises, ...imagePromises])
          .then(() => {
            console.log('[SW] Install complete. Skipping wait...');
            return self.skipWaiting();
          });
      })
  );
});

// ============================================
// ACTIVATE - Clean old caches
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
// FETCH - FIXED: Only cache GET requests
// ============================================
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // --- SKIP: POST, PUT, DELETE, etc. ---
  if (request.method !== 'GET') {
    event.respondWith(fetch(request));
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