/* Organifly · adaptador web
   La app nació como artefacto de Claude y usa window.claude.use("db" | "mcp" | "downloads" | "sample").
   Este archivo da esa misma interfaz fuera de Claude:
   - db: Firestore (users/{uid}/…) cuando firebase-config.js tiene configuración; si no, modo prototipo en localStorage.
   - mcp: Google Calendar por su API REST con el token de Google del inicio de sesión (permiso calendar.events).
   - downloads: descarga normal del navegador.
   - sample (IA): todavía no; la app usa sus alternativas sin IA. */
(function(){
  "use strict";
  const CFG = window.ORGANIFLY_FIREBASE && window.ORGANIFLY_FIREBASE.apiKey ? window.ORGANIFLY_FIREBASE : null;
  const CAL_SCOPE = "https://www.googleapis.com/auth/calendar.events";
  const TOKEN_KEY = "of-gtoken";
  const err = (code, message) => Object.assign(new Error(message || code), {code});
  const ls = {
    get(k, d){ try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch(e){ return d; } },
    set(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){} }
  };
  window.ORGANIFLY_USER = {name: "", email: "", mode: CFG ? "firebase" : "local"};

  /* ---------- Pantalla de acceso ---------- */
  function gate(onGoogle){
    const el = document.createElement("div");
    el.id = "of-gate";
    el.innerHTML = '<div class="of-gate-card"><svg viewBox="0 0 40 40" width="44" height="44" aria-hidden="true"><circle cx="18" cy="21" r="14" fill="none" stroke="#1F8FD6" stroke-width="4"/><path d="M11 21.5l5 5 9.5-11" fill="none" stroke="#1F8FD6" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M25.5 15.5c2.5-5 7-8.5 12-9-1 5-4.5 9.2-9.5 10.6" fill="#1F8FD6"/></svg>' +
      '<h1>Organi<span>fly</span></h1><p>Entra con tu cuenta de Google para ver tus tareas.</p>' +
      '<button type="button" id="of-gbtn"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3z"/><path fill="#34A853" d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22z"/><path fill="#FBBC05" d="M6.4 14c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7.4H3.1a10 10 0 0 0 0 9.2L6.4 14z"/><path fill="#EA4335" d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3.1 7.4L6.4 10C7.2 7.7 9.4 6 12 6z"/></svg>Continuar con Google</button>' +
      '<p class="of-err" id="of-gerr" hidden></p><a href="../">← Volver a la web</a></div>';
    document.body.append(el);
    const b = el.querySelector("#of-gbtn");
    b.onclick = async () => { b.disabled = true; try { await onGoogle(); el.remove(); } catch(e){ const p = el.querySelector("#of-gerr"); p.hidden = false; p.textContent = e && e.code === "auth/unauthorized-domain" ? "Este dominio no está autorizado en Firebase (Authentication → Settings → Authorized domains)." : "No se ha podido entrar. Inténtalo de nuevo."; b.disabled = false; } };
    return el;
  }

  /* ---------- Firebase ---------- */
  let fb = null, authReady = null;
  if (CFG && window.firebase){
    try { firebase.initializeApp(CFG); const fs = firebase.firestore(); try { fs.settings({ignoreUndefinedProperties: true, merge: true}); } catch(e){} fb = {auth: firebase.auth(), fs}; } catch(e){ console.warn("Firebase:", e); fb = null; }
  }
  const provider = () => { const p = new firebase.auth.GoogleAuthProvider(); p.addScope(CAL_SCOPE); p.setCustomParameters({prompt: "select_account"}); return p; };
  function keepToken(res){
    const cred = res && res.credential;
    if (cred && cred.accessToken) ls.set(TOKEN_KEY, {t: cred.accessToken, exp: Date.now() + 55 * 60 * 1000});
  }
  if (fb){
    authReady = new Promise(resolve => {
      let shown = null;
      fb.auth.onAuthStateChanged(u => {
        if (u){ if (shown){ shown.remove(); shown = null; }
          window.ORGANIFLY_USER = {name: (u.displayName || "").split(" ")[0], email: u.email || "", uid: u.uid, mode: "firebase"};
          resolve(u); }
        else if (!shown) shown = gate(async () => { const r = await fb.auth.signInWithPopup(provider()); keepToken(r); });
      });
    });
  }

  /* ---------- db ---------- */
  function firestoreDb(uid){
    const base = fb.fs.collection("users").doc(uid);
    return {
      collection: name => base.collection(name),
      doc: path => { const [c, id] = path.split("/"); return base.collection(c).doc(id); }
    };
  }
  function localDb(){
    const KEY = "of-localdb";
    const data = ls.get(KEY, {});
    const subs = {};
    const save = () => ls.set(KEY, data);
    const snapOf = c => ({metadata: {fromCache: false}, docs: Object.entries(data[c] || {}).map(([id, d]) => ({id, data: () => d}))});
    const fire = c => (subs[c] || []).forEach(f => { try { f(snapOf(c)); } catch(e){ console.error(e); } });
    const docRef = (c, id) => ({
      async set(d){ (data[c] = data[c] || {})[id] = JSON.parse(JSON.stringify(d)); save(); fire(c); },
      async update(d){ (data[c] = data[c] || {})[id] = Object.assign({}, data[c][id] || {}, JSON.parse(JSON.stringify(d))); save(); fire(c); },
      async delete(){ if (data[c]) delete data[c][id]; save(); fire(c); },
      async get(){ const v = (data[c] || {})[id]; return {exists: !!v, id, data: () => v}; },
      onSnapshot(f){ const h = () => { const v = (data[c] || {})[id]; f({exists: !!v, id, data: () => v}); }; (subs[c] = subs[c] || []).push(h); setTimeout(h, 0); return () => { subs[c] = (subs[c] || []).filter(x => x !== h); }; }
    });
    return {
      collection: c => ({
        doc: id => docRef(c, id),
        onSnapshot(f){ (subs[c] = subs[c] || []).push(f); setTimeout(() => f(snapOf(c)), 0); return () => { subs[c] = (subs[c] || []).filter(x => x !== f); }; }
      }),
      doc: path => { const [c, id] = path.split("/"); return docRef(c, id); },
      _dump: () => JSON.parse(JSON.stringify(data)),
      _load: obj => { for (const c of Object.keys(obj)){ data[c] = Object.assign(data[c] || {}, obj[c]); fire(c); } save(); }
    };
  }

  /* ---------- Google Calendar (interfaz mcp) ---------- */
  function token(){ const t = ls.get(TOKEN_KEY, null); return t && t.exp > Date.now() ? t.t : null; }
  async function getToken(interactive){
    const t = token(); if (t) return t;
    if (!fb || !fb.auth.currentUser) throw err("not_granted");
    if (!interactive) throw err("approval_required");
    const r = await fb.auth.currentUser.reauthenticateWithPopup(provider()).catch(e => { throw err("approval_required", e && e.message); });
    keepToken(r); const t2 = token(); if (!t2) throw err("approval_required"); return t2;
  }
  const rfc = s => { if (!s) return undefined; const d = new Date(s); return isNaN(d) ? s : d.toISOString(); };
  const tz = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch(e){ return "Europe/Madrid"; } };
  async function gcal(tool, input, interactive){
    const tk = await getToken(interactive);
    const cal = encodeURIComponent(input.calendarId || "primary");
    let res;
    if (tool === "list_events"){
      const q = new URLSearchParams({singleEvents: "true", orderBy: "startTime", maxResults: String(Math.min(input.pageSize || 250, 2500))});
      if (input.startTime) q.set("timeMin", rfc(input.startTime));
      if (input.endTime) q.set("timeMax", rfc(input.endTime));
      res = await fetch("https://www.googleapis.com/calendar/v3/calendars/" + cal + "/events?" + q, {headers: {Authorization: "Bearer " + tk}});
      if (res.ok){ const j = await res.json(); return {payload: {events: j.items || []}, cache: {storedAt: Date.now()}}; }
    } else if (tool === "create_event"){
      const day = s => String(s).slice(0, 10);
      const body = {summary: input.summary, description: input.description || undefined,
        start: input.allDay ? {date: day(input.startTime)} : {dateTime: input.startTime, timeZone: tz()},
        end: input.allDay ? {date: day(input.endTime)} : {dateTime: input.endTime, timeZone: tz()}};
      res = await fetch("https://www.googleapis.com/calendar/v3/calendars/" + cal + "/events", {method: "POST", headers: {Authorization: "Bearer " + tk, "Content-Type": "application/json"}, body: JSON.stringify(body)});
      if (res.ok) return {payload: await res.json()};
    } else throw err("not_in_manifest");
    if (res.status === 401){ try { localStorage.removeItem(TOKEN_KEY); } catch(e){} throw err("approval_required"); }
    if (res.status === 403 || res.status === 404) throw err("not_granted");
    throw err("upstream_error", "HTTP " + res.status);
  }
  const mcpShim = {
    async callTool(server, tool, input){
      if (server !== "Google Calendar") throw err("server_not_connected");
      const active = !!(navigator.userActivation && navigator.userActivation.isActive);
      return gcal(tool, input || {}, active);
    },
    watchTool(server, tool, input, handler, opts){
      let stop = false;
      const run = () => gcal(tool, input || {}, false).then(r => { if (!stop) handler({type: "data", result: r}); }, e => { if (!stop) handler({type: "error", error: {code: e.code || "upstream_error"}}); });
      run();
      const every = opts && opts.refetchInterval;
      const iv = every ? setInterval(run, every) : null;
      return () => { stop = true; if (iv) clearInterval(iv); };
    },
    async invalidate(){}
  };

  /* ---------- descargas ---------- */
  const downloadsShim = {
    async save({filename, data}){
      const blob = data instanceof Blob ? data : new Blob([data]);
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = filename || "archivo";
      document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    }
  };

  /* ---------- window.claude ---------- */
  let dbPromise = null;
  window.claude = {
    async use(name){
      if (name === "db"){
        if (!dbPromise) dbPromise = fb ? authReady.then(u => firestoreDb(u.uid)) : Promise.resolve(localDb());
        const db = await dbPromise; window.ORGANIFLY_DB = db; return db;
      }
      if (name === "mcp"){ if (!fb) return null; await authReady; return mcpShim; }
      if (name === "downloads") return downloadsShim;
      return null; // sample (IA) y el resto: todavía no disponibles fuera de Claude
    }
  };

  /* ---------- Importar / exportar (#copia) ---------- */
  const COLLS = ["items","projects","resources","articles","groups","sessions","invoices","expenses","payments","plans","settings","shopping","notes","classlinks","dreams","meetings","sport","giftpeople"];
  async function exportAll(){
    const db = await window.claude.use("db"), out = {};
    for (const c of COLLS){
      out[c] = await new Promise(res => { const un = db.collection(c).onSnapshot(s => { try { un && un(); } catch(e){} res(Object.fromEntries(s.docs.map(d => [d.id, d.data()]))); }, () => res({})); });
    }
    return out;
  }
  async function importAll(obj){
    const db = await window.claude.use("db"); let n = 0;
    for (const c of Object.keys(obj || {})){ if (!COLLS.includes(c)) continue;
      for (const [id, d] of Object.entries(obj[c] || {})){ await db.collection(c).doc(id).set(d); n++; } }
    return n;
  }
  window.ORGANIFLY_BACKUP = {exportAll, importAll};

  /* ---------- Panel de copia (#copia) ---------- */
  function backupPanel(){
    if (document.getElementById("of-backup")) return;
    const m = document.createElement("div"); m.id = "of-backup"; m.className = "of-modal";
    m.innerHTML = '<div class="of-card" role="dialog" aria-modal="true" aria-labelledby="of-bt"><h2 id="of-bt">Copia de seguridad</h2>' +
      '<p>Descarga todos tus datos en un archivo, o importa una copia (por ejemplo, la que te pasa Claude desde tu Organifly anterior).</p>' +
      '<button type="button" id="of-exp" class="of-btn">Descargar copia (.json)</button>' +
      '<label class="of-btn ghost">Importar copia…<input type="file" id="of-imp" accept=".json,application/json" hidden></label>' +
      '<p class="of-msg" id="of-msg" role="status"></p><button type="button" id="of-close" class="of-link">Cerrar</button></div>';
    document.body.append(m);
    const msg = t => { m.querySelector("#of-msg").textContent = t; };
    const close = () => { m.remove(); if (location.hash === "#copia") history.replaceState(null, "", location.pathname + location.search); };
    m.addEventListener("click", e => { if (e.target === m) close(); });
    m.querySelector("#of-close").onclick = close;
    m.querySelector("#of-exp").onclick = async () => { msg("Preparando…"); const data = await exportAll();
      await downloadsShim.save({filename: "organifly-copia-" + new Date().toISOString().slice(0,10) + ".json", data: new Blob([JSON.stringify(data, null, 1)], {type: "application/json"})}); msg("Copia descargada."); };
    m.querySelector("#of-imp").onchange = async e => { const f = e.target.files[0]; if (!f) return; msg("Importando…");
      try { const n = await importAll(JSON.parse(await f.text())); msg(n + " elementos importados."); } catch(err){ msg("No he podido leer ese archivo."); } };
  }
  const onHash = () => { if (location.hash === "#copia") backupPanel(); };
  addEventListener("hashchange", onHash);
  addEventListener("DOMContentLoaded", () => {
    onHash();
    const side = document.querySelector(".side");
    if (side){ const a = document.createElement("a"); a.href = "#copia"; a.className = "of-side-link"; a.textContent = "Copia de seguridad"; side.append(a);
      if (fb){ const o = document.createElement("button"); o.type = "button"; o.className = "of-side-link"; o.textContent = "Cerrar sesión"; o.onclick = () => { try { localStorage.removeItem(TOKEN_KEY); } catch(e){} fb.auth.signOut().then(() => location.reload()); }; side.append(o); }
      else { const n = document.createElement("span"); n.className = "of-side-link"; n.textContent = "Modo prueba: datos solo en este navegador"; side.append(n); } }
  });
})();
