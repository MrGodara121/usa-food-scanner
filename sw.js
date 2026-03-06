// Service Worker for USA Food Scanner PWA
const CACHE_NAME = 'foodscanner-v2';
const API_CACHE_NAME = 'api-cache-v2';

const urlsToCache = [
    '/',
    '/index.html',
    '/product.html',
    '/category.html',
    '/search.html',
    '/premium.html',
    '/login.html',
    '/dashboard.html',
    '/api-docs.html',
    '/404.html',
    '/css/style.css',
    '/css/product.css',
    '/css/mobile.css',
    '/js/app.js',
    '/js/api.js',
    '/js/auth.js',
    '/manifest.json'
];

// Install event – cache static assets
self.addEventListener('install', event => {
    console.log('Service Worker installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Caching static assets');
                return cache.addAll(urlsToCache);
            })
            .then(() => self.skipWaiting())
    );
});

// Activate event – clean old caches
self.addEventListener('activate', event => {
    console.log('Service Worker activating...');
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME && key !== API_CACHE_NAME)
                    .map(key => {
                        console.log('Deleting old cache:', key);
                        return caches.delete(key);
                    })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch event – serve from cache first, then network
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    
    // API requests – network first, then cache (stale-while-revalidate)
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    const responseClone = response.clone();
                    caches.open(API_CACHE_NAME).then(cache => {
                        cache.put(event.request, responseClone);
                    });
                    return response;
                })
                .catch(() => caches.match(event.request))
        );
        return;
    }
    
    // Static assets – cache first, then network
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    return response;
                }
                return fetch(event.request).then(response => {
                    // Don't cache if not a valid response
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseClone);
                    });
                    return response;
                });
            })
            .catch(() => {
                // If both cache and network fail, show offline page for navigation requests
                if (event.request.mode === 'navigate') {
                    return caches.match('/404.html');
                }
            })
    );
});

// Background sync for offline scans
self.addEventListener('sync', event => {
    if (event.tag === 'sync-scans') {
        console.log('Background sync triggered');
        event.waitUntil(syncScans());
    }
});

async function syncScans() {
    try {
        // Open IndexedDB
        const db = await openDB();
        const tx = db.transaction('offline-scans', 'readonly');
        const store = tx.objectStore('offline-scans');
        const scans = await store.getAll();
        
        for (const scan of scans) {
            try {
                await fetch('/api/track-scan', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(scan)
                });
                
                // Remove from IndexedDB after successful sync
                const deleteTx = db.transaction('offline-scans', 'readwrite');
                const deleteStore = deleteTx.objectStore('offline-scans');
                await deleteStore.delete(scan.id);
            } catch (error) {
                console.error('Sync failed for scan:', scan.id, error);
            }
        }
    } catch (error) {
        console.error('Sync error:', error);
    }
}

// Helper to open IndexedDB
function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('FoodScannerDB', 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            db.createObjectStore('offline-scans', { keyPath: 'id', autoIncrement: true });
        };
    });
}

// Push notifications
self.addEventListener('push', event => {
    console.log('Push notification received');
    let data = { title: 'USA Food Scanner', body: 'New update available' };
    
    try {
        if (event.data) {
            data = event.data.json();
        }
    } catch (e) {
        console.error('Push data parse error:', e);
    }
    
    const options = {
        body: data.body,
        icon: '/icons/icon-192.png',
        badge: '/icons/badge-72.png',
        vibrate: [200, 100, 200],
        data: {
            url: data.url || '/'
        },
        actions: [
            { action: 'open', title: 'View' },
            { action: 'close', title: 'Dismiss' }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

self.addEventListener('notificationclick', event => {
    event.notification.close();
    
    if (event.action === 'open' || !event.action) {
        event.waitUntil(
            clients.openWindow(event.notification.data.url)
        );
    }
});
