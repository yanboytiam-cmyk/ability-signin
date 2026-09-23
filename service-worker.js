/* Ancien service worker neutralise : il se desinscrit et vide ses caches.
   Supprimer le fichier n'aurait rien change pour les appareils qui l'ont deja
   installe ; ceux-la continueraient de servir l'ancien formulaire. */
const NOUVELLE_ADRESSE = "https://ability-visits.yanforms.com";

self.addEventListener("install", (e) => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    try {
      const noms = await caches.keys();
      await Promise.all(noms.map((n) => caches.delete(n)));
    } catch (err) {}
    try { await self.registration.unregister(); } catch (err) {}
    try {
      const clients = await self.clients.matchAll({ type: "window" });
      for (const c of clients) {
        if ("navigate" in c) { c.navigate(NOUVELLE_ADRESSE); }
      }
    } catch (err) {}
  })());
});

/* Pas de gestionnaire "fetch" : le reseau reprend la main immediatement. */
