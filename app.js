/* =============================================================
   Lab — transferts entre téléphone et ordinateur
   ============================================================= */
(() => {
  "use strict";

  const cfg = window.LAB_CONFIG || {};
  const DEMO = !cfg.supabaseUrl || /VOTRE/.test(cfg.supabaseUrl) || !window.supabase;
  const BUCKET = "transfers";
  const MAX_MB = cfg.maxFileSizeMB || 50;
  const $ = (id) => document.getElementById(id);

  /* ---------- Petits utilitaires ---------- */
  const safeStore = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch {} },
  };

  function deviceName() {
    const ua = navigator.userAgent;
    if (/iPhone/.test(ua)) return "iPhone";
    if (/iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return "iPad";
    if (/Android/.test(ua)) return /Mobile/.test(ua) ? "Android" : "Tablette Android";
    if (/Windows/.test(ua)) return "Ordinateur";
    if (/Macintosh/.test(ua)) return "Mac";
    return "Appareil";
  }
  const IS_IOS = /iPhone|iPad/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
  const IS_TOUCH = matchMedia("(pointer: coarse)").matches;

  function formatSize(b) {
    if (b == null) return "";
    if (b < 1024) return b + " o";
    if (b < 1024 * 1024) return (b / 1024).toFixed(0) + " Ko";
    if (b < 1024 * 1024 * 1024) return (b / 1024 / 1024).toFixed(1).replace(".", ",") + " Mo";
    return (b / 1024 / 1024 / 1024).toFixed(2).replace(".", ",") + " Go";
  }

  const rtf = new Intl.RelativeTimeFormat("fr", { numeric: "auto" });
  function timeAgo(iso) {
    const s = (new Date(iso).getTime() - Date.now()) / 1000;
    const a = Math.abs(s);
    if (a < 45) return "à l'instant";
    if (a < 3600) return rtf.format(Math.round(s / 60), "minute");
    if (a < 86400) return rtf.format(Math.round(s / 3600), "hour");
    if (a < 86400 * 7) return rtf.format(Math.round(s / 86400), "day");
    return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
  }

  const URL_RE = /(https?:\/\/[^\s<>"']+)/gi;
  const isSingleUrl = (t) => /^https?:\/\/\S+$/i.test(t.trim());

  let toastTimer;
  function toast(msg, isError = false) {
    const t = $("toast");
    t.textContent = msg;
    t.classList.toggle("err", isError);
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (t.hidden = true), isError ? 4500 : 2600);
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    toast("Copié !");
  }

  function frenchError(err) {
    const m = (err && (err.message || err.error_description || String(err))) || "Erreur inconnue";
    const map = [
      [/Invalid login credentials/i, "E-mail ou mot de passe incorrect."],
      [/already registered|already been registered/i, "Un compte existe déjà avec cet e-mail."],
      [/Email not confirmed/i, "Confirmez d'abord votre e-mail (cliquez sur le lien reçu par mail)."],
      [/at least 6 characters|Password should be/i, "Le mot de passe doit faire au moins 6 caractères."],
      [/valid email|invalid format|Unable to validate email/i, "Adresse e-mail invalide."],
      [/provider is not enabled|Unsupported provider/i, "La connexion Google n'est pas encore activée dans Supabase."],
      [/rate limit|too many/i, "Trop de tentatives, réessayez dans quelques minutes."],
      [/exceeded the maximum allowed size|Payload too large/i, `Fichier trop lourd (max ${MAX_MB} Mo).`],
      [/Failed to fetch|NetworkError|Load failed/i, "Pas de connexion internet."],
    ];
    for (const [re, fr] of map) if (re.test(m)) return fr;
    return m;
  }

  /* =============================================================
     Couche "serveur" : Supabase, ou démo locale
     ============================================================= */
  function makeSupabaseApi() {
    // "Se souvenir de moi" : session gardée (localStorage) ou effacée à la fermeture (sessionStorage)
    const authStorage = {
      getItem(k) { try { return localStorage.getItem(k) ?? sessionStorage.getItem(k); } catch { return null; } },
      setItem(k, v) {
        try {
          const remember = localStorage.getItem("lab-remember") !== "0";
          (remember ? localStorage : sessionStorage).setItem(k, v);
          (remember ? sessionStorage : localStorage).removeItem(k);
        } catch {}
      },
      removeItem(k) { try { localStorage.removeItem(k); sessionStorage.removeItem(k); } catch {} },
    };

    const sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
      auth: { storage: authStorage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
    const redirectTo = location.origin + location.pathname;
    let channel = null;

    return {
      async getUser() { const { data } = await sb.auth.getSession(); return data.session?.user || null; },
      onAuth(cb) { sb.auth.onAuthStateChange((event, session) => cb(event, session?.user || null)); },
      async signIn(email, password) {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
      },
      async signUp(email, password) {
        const { data, error } = await sb.auth.signUp({ email, password, options: { emailRedirectTo: redirectTo } });
        if (error) throw error;
        return { needsConfirm: !data.session };
      },
      async google() {
        const { error } = await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
        if (error) throw error;
      },
      async resetPassword(email) {
        const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo });
        if (error) throw error;
      },
      async updatePassword(password) {
        const { error } = await sb.auth.updateUser({ password });
        if (error) throw error;
      },
      async signOut() { if (channel) sb.removeChannel(channel); channel = null; await sb.auth.signOut(); },

      async list() {
        const { data, error } = await sb.from("transfers").select("*").order("created_at", { ascending: false }).limit(100);
        if (error) throw error;
        return data;
      },
      async sendText(text) {
        const { error } = await sb.from("transfers").insert({ kind: "text", content: text, device: deviceName() });
        if (error) throw error;
      },
      async sendFile(file, user) {
        const clean = file.name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w.\-]+/g, "_").slice(-120) || "fichier";
        const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${clean}`;
        const up = await sb.storage.from(BUCKET).upload(path, file, { contentType: file.type || "application/octet-stream", upsert: false });
        if (up.error) throw up.error;
        const { error } = await sb.from("transfers").insert({
          kind: "file", file_path: path, file_name: file.name, file_size: file.size, mime: file.type || null, device: deviceName(),
        });
        if (error) { await sb.storage.from(BUCKET).remove([path]); throw error; }
      },
      async fileUrl(item, download = true) {
        const { data, error } = await sb.storage.from(BUCKET).createSignedUrl(item.file_path, 120, download ? { download: item.file_name } : undefined);
        if (error) throw error;
        return data.signedUrl;
      },
      async remove(item) {
        if (item.kind === "file" && item.file_path) await sb.storage.from(BUCKET).remove([item.file_path]);
        const { error } = await sb.from("transfers").delete().eq("id", item.id);
        if (error) throw error;
      },
      subscribe(user, onChange) {
        if (channel) sb.removeChannel(channel);
        channel = sb
          .channel("transfers-" + user.id)
          .on("postgres_changes", { event: "*", schema: "public", table: "transfers", filter: `user_id=eq.${user.id}` }, onChange)
          .subscribe();
      },
    };
  }

  function makeDemoApi() {
    const KEY = "lab-demo-items";
    const blobs = new Map(); // fichiers gardés en mémoire seulement
    let user = null;
    let authCb = () => {};
    const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } };
    const save = (items) => safeStore.set(KEY, JSON.stringify(items.filter((i) => i.kind === "text")));
    let items = load();
    const add = (it) => { items.unshift({ id: crypto.randomUUID(), created_at: new Date().toISOString(), device: deviceName(), ...it }); save(items); };
    try { if (sessionStorage.getItem("lab-demo-user")) user = { id: "demo", email: sessionStorage.getItem("lab-demo-user") }; } catch {}

    return {
      async getUser() { return user; },
      onAuth(cb) { authCb = cb; },
      async signIn(email) { user = { id: "demo", email }; try { sessionStorage.setItem("lab-demo-user", email); } catch {} authCb("SIGNED_IN", user); },
      async signUp(email) { await this.signIn(email); return { needsConfirm: false }; },
      async google() { await this.signIn("demo@google"); },
      async resetPassword() {},
      async updatePassword() {},
      async signOut() { user = null; try { sessionStorage.removeItem("lab-demo-user"); } catch {} authCb("SIGNED_OUT", null); },
      async list() { return items.filter((i) => i.kind === "text" || blobs.has(i.id)); },
      async sendText(text) { add({ kind: "text", content: text }); },
      async sendFile(file) {
        const id = crypto.randomUUID();
        blobs.set(id, file);
        items.unshift({ id, kind: "file", file_name: file.name, file_size: file.size, mime: file.type, created_at: new Date().toISOString(), device: deviceName() });
      },
      async fileUrl(item) { return URL.createObjectURL(blobs.get(item.id)); },
      async remove(item) { items = items.filter((i) => i.id !== item.id); blobs.delete(item.id); save(items); },
      subscribe() {},
    };
  }

  const api = DEMO ? makeDemoApi() : makeSupabaseApi();
  if (DEMO) $("demo-banner").hidden = false;

  /* =============================================================
     Écran de connexion
     ============================================================= */
  let mode = "login"; // ou "signup"
  let currentUser = null;

  function setMode(m) {
    mode = m;
    const signup = m === "signup";
    $("login-title").textContent = signup ? "Créer un compte" : "Bon retour !";
    $("login-subtitle").textContent = signup ? "Quelques secondes et c'est prêt" : "Connectez-vous pour continuer";
    $("login-submit").textContent = signup ? "Créer mon compte" : "Se connecter";
    $("switch-text").textContent = signup ? "Déjà un compte ?" : "Pas encore de compte ?";
    $("switch-mode").textContent = signup ? "Se connecter" : "Créer un compte";
    $("forgot").hidden = signup;
    $("password").autocomplete = signup ? "new-password" : "current-password";
    showLoginError("");
  }

  function showLoginError(msg) {
    const e = $("login-error");
    e.textContent = msg;
    e.hidden = !msg;
  }

  $("remember").checked = safeStore.get("lab-remember") !== "0";
  $("remember").addEventListener("change", (e) => safeStore.set("lab-remember", e.target.checked ? "1" : "0"));

  $("toggle-pw").addEventListener("click", () => {
    const pw = $("password");
    const show = pw.type === "password";
    pw.type = show ? "text" : "password";
    $("toggle-pw").classList.toggle("on", show);
    $("toggle-pw").setAttribute("aria-label", show ? "Masquer le mot de passe" : "Afficher le mot de passe");
  });

  $("switch-mode").addEventListener("click", () => setMode(mode === "login" ? "signup" : "login"));

  $("login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = $("email").value.trim();
    const password = $("password").value;
    if (!email || !password) return showLoginError("Remplissez l'e-mail et le mot de passe.");
    if (password.length < 6) return showLoginError("Le mot de passe doit faire au moins 6 caractères.");
    const btn = $("login-submit");
    btn.disabled = true;
    showLoginError("");
    try {
      if (mode === "signup") {
        const { needsConfirm } = await api.signUp(email, password);
        if (needsConfirm) {
          setMode("login");
          toast("Compte créé ! Confirmez-le via le lien reçu par mail.");
        }
      } else {
        await api.signIn(email, password);
      }
    } catch (err) {
      showLoginError(frenchError(err));
    } finally {
      btn.disabled = false;
    }
  });

  $("forgot").addEventListener("click", async () => {
    const email = $("email").value.trim();
    if (!email) return showLoginError("Tapez d'abord votre adresse e-mail, puis cliquez sur « Mot de passe oublié ».");
    try {
      await api.resetPassword(email);
      showLoginError("");
      toast("E-mail de réinitialisation envoyé.");
    } catch (err) {
      showLoginError(frenchError(err));
    }
  });

  $("google").addEventListener("click", async () => {
    try { await api.google(); } catch (err) { showLoginError(frenchError(err)); }
  });

  /* =============================================================
     Écran principal
     ============================================================= */
  let picked = [];
  let items = [];
  let knownIds = new Set();

  const textInput = $("text-input");
  function autoGrow() {
    textInput.style.height = "auto";
    textInput.style.height = Math.min(textInput.scrollHeight + 2, 180) + "px";
  }
  textInput.addEventListener("input", autoGrow);
  textInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey && !IS_TOUCH) { e.preventDefault(); sendText(); }
  });
  $("text-form").addEventListener("submit", (e) => { e.preventDefault(); sendText(); });

  async function sendText() {
    const text = textInput.value.trim();
    if (!text) { textInput.focus(); return false; }
    try {
      await api.sendText(text);
      textInput.value = "";
      autoGrow();
      toast("Envoyé !");
      refresh();
      return true;
    } catch (err) {
      toast(frenchError(err), true);
      return false;
    }
  }

  // ---- Sélection de fichiers ----
  const dz = $("dropzone");
  const fileInput = $("file-input");
  dz.addEventListener("click", (e) => { if (!e.target.closest(".picked")) fileInput.click(); });
  dz.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInput.click(); } });
  fileInput.addEventListener("change", () => { addFiles(fileInput.files); fileInput.value = ""; });
  ["dragenter", "dragover"].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add("over"); }));
  ["dragleave", "drop"].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.remove("over"); }));
  dz.addEventListener("drop", (e) => addFiles(e.dataTransfer.files));
  // Empêche le navigateur d'ouvrir un fichier lâché à côté de la zone
  window.addEventListener("dragover", (e) => e.preventDefault());
  window.addEventListener("drop", (e) => e.preventDefault());
  // Coller une capture d'écran (Ctrl+V) sur ordinateur
  document.addEventListener("paste", (e) => {
    if ($("view-home").hidden) return;
    const files = [...(e.clipboardData?.files || [])];
    if (files.length) { e.preventDefault(); addFiles(files); }
  });

  function addFiles(list) {
    const tooBig = [];
    for (const f of list) {
      if (f.size > MAX_MB * 1024 * 1024) tooBig.push(f.name);
      else picked.push(f);
    }
    if (tooBig.length) toast(`Trop lourd (max ${MAX_MB} Mo) : ${tooBig.join(", ")}`, true);
    renderPicked();
  }

  function renderPicked() {
    const ul = $("picked");
    ul.textContent = "";
    picked.forEach((f, i) => {
      const li = document.createElement("li");
      const name = document.createElement("span"); name.className = "name"; name.textContent = f.name;
      const size = document.createElement("span"); size.className = "size"; size.textContent = formatSize(f.size);
      const rm = document.createElement("button"); rm.type = "button"; rm.className = "rm"; rm.textContent = "×";
      rm.setAttribute("aria-label", "Retirer " + f.name);
      rm.addEventListener("click", (e) => { e.stopPropagation(); picked.splice(i, 1); renderPicked(); });
      li.append(name, size, rm);
      ul.appendChild(li);
    });
    ul.hidden = picked.length === 0;
    dz.classList.toggle("has-files", picked.length > 0);
    dz.querySelector(".drop-inner strong").textContent = picked.length
      ? `${picked.length} fichier${picked.length > 1 ? "s" : ""} prêt${picked.length > 1 ? "s" : ""}`
      : "Déposez vos fichiers ici";
    dz.querySelector(".drop-inner span").textContent = picked.length ? "cliquez pour en ajouter" : "ou cliquez pour parcourir";
  }

  // ---- Bouton Envoyer (texte + fichiers) ----
  $("send-all").addEventListener("click", async () => {
    const hasText = textInput.value.trim().length > 0;
    if (!hasText && picked.length === 0) {
      toast("Ajoutez un lien, un message ou un fichier.");
      return;
    }
    const btn = $("send-all");
    const label = btn.querySelector("span");
    btn.disabled = true;
    try {
      if (hasText) {
        const ok = await sendText();
        if (!ok) return;
      }
      const files = [...picked];
      let done = 0;
      const failed = [];
      for (const f of files) {
        label.textContent = `Envoi ${done + 1}/${files.length}…`;
        try {
          await api.sendFile(f, currentUser);
          picked = picked.filter((p) => p !== f);
        } catch (err) {
          failed.push(`${f.name} (${frenchError(err)})`);
        }
        done++;
      }
      renderPicked();
      if (failed.length) toast("Échec : " + failed.join(", "), true);
      else if (files.length) toast(files.length > 1 ? `${files.length} fichiers envoyés !` : "Fichier envoyé !");
      refresh();
    } finally {
      btn.disabled = false;
      label.textContent = "Envoyer";
    }
  });

  // ---- Historique ----
  const ICONS = {
    link: '<svg viewBox="0 0 24 24"><path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></svg>',
    text: '<svg viewBox="0 0 24 24"><path d="M4 5h16v11H9l-5 4z"/></svg>',
    file: '<svg viewBox="0 0 24 24"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></svg>',
    image: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 17l-5-5-9 8"/></svg>',
  };

  function chip(label, onClick, cls = "") {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chip " + cls;
    b.textContent = label;
    b.addEventListener("click", onClick);
    return b;
  }

  function linkified(text) {
    const frag = document.createDocumentFragment();
    let last = 0;
    text.replace(URL_RE, (m, _g, idx) => {
      if (idx > last) frag.append(text.slice(last, idx));
      const a = document.createElement("a");
      a.href = m; a.target = "_blank"; a.rel = "noopener noreferrer"; a.textContent = m;
      frag.append(a);
      last = idx + m.length;
      return m;
    });
    if (last < text.length) frag.append(text.slice(last));
    return frag;
  }

  async function openFile(item, download) {
    try {
      const url = await api.fileUrl(item, download);
      if (DEMO || IS_IOS || !download) {
        window.open(url, "_blank", "noopener");
      } else {
        const a = document.createElement("a");
        a.href = url; a.download = item.file_name;
        document.body.appendChild(a); a.click(); a.remove();
      }
    } catch (err) {
      toast(frenchError(err), true);
    }
  }

  function renderList() {
    const ul = $("list");
    ul.textContent = "";
    $("empty").hidden = items.length > 0;
    for (const it of items) {
      const li = document.createElement("li");
      li.className = "item" + (knownIds.size && !knownIds.has(it.id) ? " is-new" : "");

      const isFile = it.kind === "file";
      const isLink = !isFile && isSingleUrl(it.content || "");
      const isImage = isFile && /^image\//.test(it.mime || "");

      const icon = document.createElement("div");
      icon.className = "item-icon";
      icon.innerHTML = isFile ? (isImage ? ICONS.image : ICONS.file) : isLink ? ICONS.link : ICONS.text;

      const body = document.createElement("div");
      body.className = "item-body";
      const main = document.createElement("div");
      main.className = "item-main";
      if (isFile) main.textContent = it.file_name;
      else main.append(linkified(it.content || ""));

      const meta = document.createElement("div");
      meta.className = "item-meta";
      meta.textContent = [isFile ? formatSize(it.file_size) : null, it.device ? "depuis " + it.device : null, timeAgo(it.created_at)]
        .filter(Boolean).join(" · ");

      const actions = document.createElement("div");
      actions.className = "item-actions";
      if (isFile) {
        actions.append(chip("Télécharger", () => openFile(it, true), "primary"));
        if (isImage || /pdf|video|audio|text/.test(it.mime || "")) actions.append(chip("Ouvrir", () => openFile(it, false)));
      } else {
        if (isLink) actions.append(chip("Ouvrir", () => window.open(it.content.trim(), "_blank", "noopener"), "primary"));
        actions.append(chip("Copier", () => copyText(it.content)));
      }
      actions.append(chip("Supprimer", async () => {
        if (!confirm(isFile ? `Supprimer « ${it.file_name} » ?` : "Supprimer ce message ?")) return;
        try { await api.remove(it); items = items.filter((x) => x.id !== it.id); renderList(); }
        catch (err) { toast(frenchError(err), true); }
      }, "danger"));

      body.append(main, meta, actions);
      li.append(icon, body);
      ul.appendChild(li);
    }
    knownIds = new Set(items.map((i) => i.id));
  }

  let refreshing = false;
  async function refresh() {
    if (!currentUser || refreshing) return;
    refreshing = true;
    try {
      items = await api.list();
      renderList();
    } catch (err) {
      toast(frenchError(err), true);
    } finally {
      refreshing = false;
    }
  }
  $("refresh").addEventListener("click", refresh);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) refresh(); });
  window.addEventListener("focus", refresh);
  setInterval(() => { if (!document.hidden) refresh(); }, 60000);

  $("logout").addEventListener("click", async () => {
    if (!confirm("Se déconnecter ?")) return;
    await api.signOut();
  });

  /* =============================================================
     Partage entrant (menu « Partager » Android / Raccourci iPhone)
     ============================================================= */
  let pendingShare = null;

  async function readIncomingShare() {
    const params = new URLSearchParams(location.search);
    const parts = [params.get("title"), params.get("text"), params.get("url")].filter(Boolean);
    const share = { text: [...new Set(parts)].join("\n"), files: [], auto: params.get("send") === "1" };

    if (params.get("share") === "1" && "caches" in window) {
      try {
        const cache = await caches.open("lab-share");
        const metaRes = await cache.match("/__share/meta");
        if (metaRes) {
          const meta = await metaRes.json();
          if (meta.text) share.text = [share.text, meta.text].filter(Boolean).join("\n");
          for (const f of meta.files || []) {
            const r = await cache.match(f.key);
            if (r) share.files.push(new File([await r.blob()], f.name, { type: f.type }));
          }
        }
        await caches.delete("lab-share");
      } catch {}
    }
    if (params.toString()) history.replaceState(null, "", location.pathname);
    return share.text || share.files.length ? share : null;
  }

  async function applyPendingShare() {
    if (!pendingShare) return;
    const s = pendingShare;
    pendingShare = null;
    if (s.text) { textInput.value = s.text; autoGrow(); }
    if (s.files.length) addFiles(s.files);
    if (s.auto) $("send-all").click();
    else toast("Prêt à envoyer : appuyez sur Envoyer");
  }

  /* =============================================================
     Navigation entre les écrans
     ============================================================= */
  function show(user) {
    const changed = user?.id !== currentUser?.id;
    currentUser = user;
    $("view-login").hidden = !!user;
    $("view-home").hidden = !user;
    if (user && changed) {
      knownIds = new Set();
      api.subscribe(user, () => refresh());
      refresh();
      applyPendingShare();
    }
    if (!user) { items = []; $("password").value = ""; }
  }

  api.onAuth(async (event, user) => {
    if (event === "PASSWORD_RECOVERY") {
      const pw = prompt("Choisissez un nouveau mot de passe (6 caractères minimum) :");
      if (pw && pw.length >= 6) {
        try { await api.updatePassword(pw); toast("Mot de passe changé !"); }
        catch (err) { toast(frenchError(err), true); }
      }
    }
    show(user);
  });

  (async () => {
    pendingShare = await readIncomingShare();
    show(await api.getUser());
  })();

  /* ---------- Service worker (installation + partage Android) ---------- */
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
})();
