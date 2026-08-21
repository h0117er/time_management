/* 도장판 서비스워커 — 앱 껍데기를 캐시해 오프라인에서도 열리게 합니다.
   앱을 수정한 뒤에는 아래 CACHE 버전 숫자를 올려야 새 버전이 반영됩니다. */
const CACHE = 'dojangpan-v1';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // Firebase / 구글 로그인 요청은 절대 캐시하지 않습니다.
  if (/firestore|googleapis|gstatic|firebaseapp|identitytoolkit/.test(url.hostname + url.pathname)) return;

  // 같은 출처의 문서·자원은 네트워크 우선, 실패하면 캐시
  if (url.origin === location.origin) {
    e.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  // 폰트 등 외부 자원은 캐시 우선
  e.respondWith(
    caches.match(req).then(r => r || fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
      return res;
    }).catch(() => r))
  );
});
