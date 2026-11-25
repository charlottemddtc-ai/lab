// Service worker de Lab : rend l'appli installable et reçoit le menu « Partager » d'Android.
const VERSION = "lab-v5";
const SHELL = ["./", "index.html", "styles.css", "app.js", "config.js", "manifest.webmanifest", "icons/icon-192.png", "icons/apple-touch-icon.png", "logo.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k !== "lab-share").map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  // Partage depuis Android : on garde le contenu partagé, puis on ouvre l'appli
  if (e.request.method === "POST" && url.pathname.endsWith("/share-target")) {
    e.respondWith(handleShare(e.request, url));
    return;
  }

  // Fichiers de l'appli + bibliothèque Supabase + polices :
  // on affiche tout de suite la version gardée en mémoire (démarrage instantané),
  // et on télécharge la nouvelle version en arrière-plan pour la prochaine ouverture.
  const isStatic =
    url.origin === self.location.origin ||
    url.hostname === "cdn.jsdelivr.net" ||
    url.hostname === "cdnjs.cloudflare.com" ||
    url.hostname === "fonts.googleapis.com" ||
    url.hostname === "fonts.gstatic.com";
  if (e.request.method === "GET" && isStatic) {
    e.respondWith(staleWhileRevalidate(e, url));
  }
});

async function staleWhileRevalidate(e, url) {
  const cache = await caches.open(VERSION);
  const isPage = e.request.mode === "navigate";
  // Pour une page, on ignore les paramètres (?share=1, ?text=...) : même page en mémoire
  const key = isPage ? url.origin + url.pathname : e.request;
  const cached = await cache.match(key);
  const network = fetch(e.request)
    .then((res) => {
      if (res.ok && !res.redirected) cache.put(key, res.clone());
      return res;
    })
    .catch(() => null);
  if (cached) {
    e.waitUntil(network);
    return cached;
  }
  return (await network) || (isPage && (await cache.match("./"))) || Response.error();
}

async function handleShare(request, url) {
  const base = url.pathname.replace(/share-target$/, "");
  try {
    const form = await request.formData();
    const text = [form.get("title"), form.get("text"), form.get("url")].filter(Boolean);
    const cache = await caches.open("lab-share");
    const files = [];
    let i = 0;
    for (const f of form.getAll("files")) {
      if (!(f instanceof File) || !f.size) continue;
      const key = `/__share/file-${i++}`;
      await cache.put(key, new Response(f, { headers: { "Content-Type": f.type || "application/octet-stream" } }));
      files.push({ key, name: f.name, type: f.type });
    }
    await cache.put("/__share/meta", new Response(JSON.stringify({ text: [...new Set(text)].join("\n"), files }), {
      headers: { "Content-Type": "application/json" },
    }));
  } catch (err) {
    // en cas d'échec, on ouvre quand même l'appli
  }
  return Response.redirect(base + "?share=1", 303);
}
