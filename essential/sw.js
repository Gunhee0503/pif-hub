/* PIF Hub — essential service worker
   - 페이지(HTML)는 네트워크 우선: 새 버전이 바로 반영되고, 오프라인이면 캐시로
   - 이 폴더의 이미지·아이콘은 캐시 우선
   - 다른 출처(Supabase 등)와 /shared/ 는 건드리지 않음 */
const CACHE = 'pifhub-essential-v1';
const SHELL = ['./', './index.html', './manifest.json'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const scope = new URL(self.registration.scope);
  const fontHost = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (url.origin !== location.origin && !fontHost) return;
  if (url.origin === location.origin && !url.pathname.startsWith(scope.pathname)) return;
  const isPage = req.mode === 'navigate' || /\.html?$/.test(url.pathname) || url.pathname.endsWith('/');
  if (isPage) {
    e.respondWith(fetch(req).then(res => { const cp = res.clone(); caches.open(CACHE).then(c => c.put(req, cp)); return res; })
      .catch(() => caches.match(req).then(r => r || caches.match('./index.html'))));
    return;
  }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
    if (res && (res.status === 200 || res.type === 'opaque')) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(req, cp)); }
    return res;
  })));
});
