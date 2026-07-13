// ============================================
// LIQUORBELLE — DYNAMIC SERVICE WORKER
// Works on GitHub Pages (/liquorbelle/) AND custom domain (/)
// ============================================

const CACHE_NAME = 'liquorbelle-v5';

// --- AUTO-DETECT BASE PATH ---
const BASE_PATH = self.location.pathname.replace('sw.js', '');
const API_BASE = 'https://liquorbelle-mpesa-backend.onrender.com'; // Your Render API

console.log('[SW] Base Path detected:', BASE_PATH);

// --- HTML PAGES TO CACHE ---
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

console.log('[SW] Caching HTML assets:', STATIC_ASSETS);

// ============================================
// 🔥 HARDCODED IMAGE PRE‑CACHE (Guaranteed)
// ============================================
const PRECACHE_IMAGES = [
  // --- Category icons ---
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

  // --- Logo & Brand ---
  'https://res.cloudinary.com/dvqjgbdhp/image/upload/f_auto,q_auto,w_120,c_fit/v1780905905/WhatsApp_Image_2026-06-04_at_3.41.50_PM_saprsh.jpg',
  'https://res.cloudinary.com/dvqjgbdhp/image/upload/f_auto,q_auto,w_800,c_fit/v1781119164/liqbb_goc41e.png',

  // --- M-PESA ---
  'https://res.cloudinary.com/dvqjgbdhp/image/upload/f_auto,q_auto,w_120,c_fit/v1781875182/Mpesa_bvcz8v.png',

  // --- Banner ---
  'https://res.cloudinary.com/dvqjgbdhp/image/upload/v1782462538/af530399-7256-422f-97b7-71496c648bc1_osqga6.png',
];

// ============================================
// INSTALL
// ============================================
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static HTML assets...');

        // 1. Cache HTML pages (with error handling)
        const htmlPromises = STATIC_ASSETS.map(url =>
          cache.add(url).catch(err => {
            console.warn('[SW] Failed to cache HTML:', url, err);
          })
        );

        // 2. Cache hardcoded images (with error handling)
        const imagePromises = PRECACHE_IMAGES.map(url =>
          fetch(url)
            .then(res => {
              if (res.ok) {
                cache.put(url, res);
                console.log('[SW] Pre-cached hardcoded image:', url);
              }
            })
            .catch(() => {
              console.warn('[SW] Failed to pre-cache hardcoded image:', url);
            })
        );

        // Wait for HTML pages to finish, but images run in background
        return Promise.all(htmlPromises)
          .then(() => {
            // Start image pre-caching in the background
            Promise.all(imagePromises).then(() => {
              console.log('[SW] Hardcoded image pre-caching complete.');
            });

            // 3. 🚀 DYNAMICALLY FETCH PRODUCT IMAGES FROM API (Background)
            // This runs AFTER HTML is cached, and does NOT block install.
            fetch(API_BASE + '/api/db/products')
              .then(res => res.json())
              .then(data => {
                if (data.success && data.products) {
                  console.log('[SW] Fetching dynamic product images from API...');
                  const productImages = data.products
                    .map(p => p.image)
                    .filter(url => url && url.trim() !== '');

                  // Cache each product image
                  productImages.forEach(url => {
                    caches.open(CACHE_NAME).then(cache => {
                      fetch(url)
                        .then(res => {
                          if (res.ok) {
                            cache.put(url, res);
                            console.log('[SW] Pre-cached dynamic image:', url);
                          }
                        })
                        .catch(() => {
                          console.warn('[SW] Failed to pre-cache dynamic image:', url);
                        });
                    });
                  });
                }
              })
              .catch(() => {
                console.warn('[SW] Could not fetch product list for dynamic image caching.');
              });

            console.log('[SW] HTML caching complete. Skipping wait...');
            return self.skipWaiting();
          });
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
              console.log('[SW] Image: Cached (first visit)');
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