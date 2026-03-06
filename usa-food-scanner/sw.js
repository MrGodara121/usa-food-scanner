// Service Worker for USA Food Scanner PWA
const CACHE_NAME = 'foodscanner-v2';
const API_CACHE_NAME = 'api-cache-v2';
const OFFLINE_URL = '/offline.html';

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
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('✅ Caching static assets');
                return cache.addAll(urlsToCache);
            })
            .then(() => self.skipWaiting())
    );
});

// Activate event – clean old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME && key !== API_CACHE_NAME)
                    .map(key => caches.delete(key))
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
    
    // HTML requests – network first, fallback to cache, then offline page
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseClone);
                    });
                    return response;
                })
                .catch(() => 
                    caches.match(event.request).then(cached => 
                        cached || caches.match(OFFLINE_URL)
                    )
                )
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
    );
});

// Background sync for offline scans
self.addEventListener('sync', event => {
    if (event.tag === 'sync-scans') {
        event.waitUntil(syncScans());
    }
});

async function syncScans() {
    try {
        const db = await openDB();
        const scans = await db.getAll('offline-scans');
        
        for (const scan of scans) {
            try {
                const response = await fetch('/api/track-scan', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(scan)
                });
                if (response.ok) {
                    await db.delete('offline-scans', scan.id);
                }
            } catch (error) {
                console.error('Sync failed:', error);
            }
        }
    } catch (error) {
        console.error('Sync error:', error);
    }
}

// Push notifications
self.addEventListener('push', event => {
    const data = event.data.json();
    const options = {
        body: data.body,
        icon: '/images/icons/icon-192.png',
        badge: '/images/icons/badge-72.png',
        vibrate: [200, 100, 200],
        data: {
            url: data.url,
            timestamp: Date.now()
        },
        actions: [
            {
                action: 'open',
                title: 'View'
            },
            {
                action: 'close',
                title: 'Dismiss'
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// Notification click event
self.addEventListener('notificationclick', event => {
    event.notification.close();
    
    if (event.action === 'open' || !event.action) {
        event.waitUntil(
            clients.openWindow(event.notification.data.url || '/')
        );
    }
});

// Periodic sync for weekly reports (if supported)
if ('periodicSync' in self.registration) {
    self.addEventListener('periodicsync', event => {
        if (event.tag === 'weekly-report') {
            event.waitUntil(generateWeeklyReport());
        }
    });
}

async function generateWeeklyReport() {
    // This would be handled by the worker API
    console.log('Generating weekly reports...');
}

// Helper function to open IndexedDB
function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('FoodScannerDB', 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('offline-scans')) {
                db.createObjectStore('offline-scans', { keyPath: 'id', autoIncrement: true });
            }
        };
    });
}
