/* Ability and Empowerment Services - patient sign-in, offline shell.
 *
 * Two rules only:
 *   1. the page itself is network-first, so a redeploy reaches the tablet on
 *      the next open instead of being pinned to a stale cached copy;
 *   2. the static shell is cache-first, so the form still opens when the
 *      clinic's wifi drops.
 *
 * Submissions are never touched here. They are POSTs, the browser does not
 * cache them, and the page keeps its own retry queue in localStorage.
 */
var VERSION = "aes-signin-v6";
var SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./assets/ability-logo.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./vendor/jspdf.umd.min.js"
];

self.addEventListener("install", function(ev){
  ev.waitUntil(
    caches.open(VERSION).then(function(c){
      // One bad URL must not fail the whole install and leave the app uncached.
      return Promise.all(SHELL.map(function(u){
        return c.add(u).catch(function(){});
      }));
    }).then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function(ev){
  ev.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.map(function(k){
        return k === VERSION ? null : caches.delete(k);
      }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function(ev){
  var req = ev.request;
  if (req.method !== "GET") return;

  var url = new URL(req.url);
  // Only our own origin. The geocoding providers and the n8n webhook must
  // always go to the network, and must never be served from a cache.
  if (url.origin !== self.location.origin) return;

  var isPage = req.mode === "navigate" ||
               (req.headers.get("accept") || "").indexOf("text/html") !== -1;

  if (isPage){
    ev.respondWith(
      // no-store, not a plain fetch: GitHub Pages serves the HTML with a
      // max-age, so a plain fetch is answered from the browser's own HTTP
      // cache and a redeployed fix would sit unseen on the clinic tablet for
      // as long as that header says. Network-first has to mean the network.
      fetch(req.url, {cache: "no-store", credentials: "same-origin"}).then(function(res){
        var copy = res.clone();
        caches.open(VERSION).then(function(c){ c.put(req, copy); });
        return res;
      }).catch(function(){
        return caches.match(req).then(function(hit){
          return hit || caches.match("./index.html");
        });
      })
    );
    return;
  }

  ev.respondWith(
    caches.match(req).then(function(hit){
      if (hit) return hit;
      return fetch(req).then(function(res){
        if (res && res.status === 200 && res.type === "basic"){
          var copy = res.clone();
          caches.open(VERSION).then(function(c){ c.put(req, copy); });
        }
        return res;
      });
    })
  );
});
