// Service Worker for Quran Reciters Encyclopedia
const CACHE_VERSION = 'v1';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `dynamic-${CACHE_VERSION}`;
const AUDIO_CACHE = `audio-${CACHE_VERSION}`;

// Static assets to cache immediately
const STATIC_ASSETS = [
    '/',
    '/offline',
    '/logo.png',
    '/manifest.json'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    console.log('[SW] Installing Service Worker...');
    event.waitUntil(
        caches.open(STATIC_CACHE).then((cache) => {
            console.log('[SW] Caching static assets');
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating Service Worker...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name.startsWith('v') && name !== STATIC_CACHE && name !== DYNAMIC_CACHE && name !== AUDIO_CACHE)
                    .map((name) => {
                        console.log('[SW] Deleting old cache:', name);
                        return caches.delete(name);
                    })
            );
        })
    );
    return self.clients.claim();
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') return;

    // Skip chrome extensions and other protocols
    if (!url.protocol.startsWith('http')) return;

    // Audio files - Cache First strategy
    // Only intercept common audio extensions to avoid breaking API calls or other assets
    const audioExtensions = ['.mp3', '.m4a', '.wav', '.ogg', '.aac'];
    const isAudio = audioExtensions.some(ext => url.pathname.toLowerCase().endsWith(ext));

    if (isAudio) {
        event.respondWith(
            caches.match(request).then((cachedResponse) => {
                if (cachedResponse) {
                    console.log('[SW] Serving audio from cache:', request.url);
                    return cachedResponse;
                }

                return fetch(request).then((response) => {
                    // Only cache successful responses
                    if (!response || response.status !== 200) {
                        return response;
                    }

                    const responseToCache = response.clone();
                    caches.open(AUDIO_CACHE).then((cache) => {
                        console.log('[SW] Caching new audio:', request.url);
                        cache.put(request, responseToCache);
                    });

                    return response;
                }).catch((err) => {
                    console.error('[SW] Audio fetch failed:', err);
                    // Return a 404 or just let it fail so the browser can handle it correctly
                    // Instead of a 503 text which breaks the <audio> tag
                    return new Response(null, { status: 404, statusText: 'Not Found' });
                });
            })
        );
        return;
    }

    // API requests - Network First strategy
    if (url.pathname.startsWith('/api/') || url.hostname.includes('supabase')) {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    const responseToCache = response.clone();
                    caches.open(DYNAMIC_CACHE).then((cache) => {
                        cache.put(request, responseToCache);
                    });
                    return response;
                })
                .catch(() => {
                    return caches.match(request).then((cachedResponse) => {
                        return cachedResponse || new Response('Offline - data not available', { status: 503 });
                    });
                })
        );
        return;
    }

    // Static assets and pages - Cache First, fallback to Network
    event.respondWith(
        caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }

            return fetch(request).then((response) => {
                // Only cache successful responses
                if (!response || response.status !== 200) {
                    return response;
                }

                const responseToCache = response.clone();
                caches.open(DYNAMIC_CACHE).then((cache) => {
                    cache.put(request, responseToCache);
                });

                return response;
            }).catch(() => {
                // Return offline page for navigation requests
                if (request.mode === 'navigate') {
                    return caches.match('/offline');
                }
                return new Response('Offline', { status: 503 });
            });
        })
    );
});

// Helper to broadcast messages to all clients
const broadcast = (message) => {
    self.clients.matchAll().then((clients) => {
        clients.forEach((client) => client.postMessage(message));
    });
};

// Handle messages from clients
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }

    if (event.data && event.data.type === 'CACHE_AUDIO') {
        const { url } = event.data;
        caches.open(AUDIO_CACHE).then((cache) => {
            // Try fetching with CORS first
            fetch(url, { mode: 'cors', credentials: 'omit' }).then((response) => {
                // If response is not ok (e.g. 404, 500), throw error
                if (!response.ok && response.status !== 0) {
                    throw new Error(`Fetch failed with status: ${response.status}`);
                }

                // If opaque response (status 0) or ok response
                const responseToCache = response.clone();
                cache.put(url, responseToCache).then(() => {
                    // Broadcast to all clients
                    broadcast({ type: 'DOWNLOAD_COMPLETE', url, success: true });
                    if (event.ports && event.ports[0]) {
                        event.ports[0].postMessage({ success: true });
                    }
                });
            }).catch((err) => {
                console.error('[SW] Download failed:', err);
                broadcast({ type: 'DOWNLOAD_ERROR', url, success: false });
                if (event.ports && event.ports[0]) {
                    event.ports[0].postMessage({ success: false });
                }
            });
        });
    }

    if (event.data && event.data.type === 'DELETE_AUDIO') {
        const { url } = event.data;
        caches.open(AUDIO_CACHE).then((cache) => {
            cache.delete(url).then(() => {
                event.ports[0].postMessage({ success: true });
            });
        });
    }
});
