// IvanaFin Seerr helper: "Cancel request" for every IvanaFin client (web, Samsung, Fire TV).
//
// Jellyfin Enhanced's Seerr proxy (what web/Samsung use) can't delete requests, and Seerr deleting a
// request only drops the record - an approved title stays in Radarr/Sonarr and keeps downloading.
// User 2026-11-19: Cancel should STOP the download. So this small service, next to Seerr:
//   GET  /can-cancel?type=movie|tv&tmdbId=N  -> { can: boolean }
//   POST /cancel  { type, tmdbId }           -> { ok, removed, arr }
// Callers send their own Jellyfin token (Authorization: MediaBrowser Token="..." or X-Emby-Token); it is
// checked against Jellyfin and matched to the Seerr user (Seerr's jellyfinUserId). Same rule as Seerr /
// the Android app: Seerr admins / request managers may cancel any request, everyone else only their own
// still-pending one. Nothing that is already in the library is touched:
//   - film: Radarr movie removed with its queue items (download client too) - unless Radarr already
//     has the file (then only the request goes).
//   - show: whole series removed from Sonarr (+ queue) when nothing of it is downloaded yet; otherwise
//     only the requested seasons are unmonitored and their queue items removed.
// Env: SEERR (http://host:5055), SEERR_KEY, JELLYFIN (http://host:8096), PORT (5056).
// Run: deno run --allow-net --allow-env main.ts   (docker: see README.md)

const SEERR = Deno.env.get("SEERR") ?? "http://localhost:5055";
const SEERR_KEY = Deno.env.get("SEERR_KEY") ?? "";
const JELLYFIN = Deno.env.get("JELLYFIN") ?? "http://localhost:8096";
const PORT = Number(Deno.env.get("PORT") ?? 5056);

const ADMIN = 2, MANAGE_REQUESTS = 16; // Seerr permission bits
const PENDING = 1, APPROVED = 2;       // Seerr request status
const AVAILABLE = 5;                   // Seerr media status

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, X-Emby-Token, X-Emby-Authorization, Content-Type",
};
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}
function log(...a: unknown[]) { console.log(new Date().toISOString(), ...a); }

async function call(url: string, init: RequestInit & { key?: string } = {}) {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (init.key) headers["X-Api-Key"] = init.key;
  if (init.body) headers["Content-Type"] = "application/json";
  const r = await fetch(url, { ...init, headers: { ...headers, ...(init.headers as Record<string, string> ?? {}) } });
  if (!r.ok) throw new Error(`${init.method ?? "GET"} ${url.replace(/apikey=[^&]+/i, "apikey=…")} -> ${r.status}`);
  const t = await r.text();
  return t ? JSON.parse(t) : null;
}
const seerr = (path: string, init: RequestInit = {}) => call(SEERR + "/api/v1" + path, { ...init, key: SEERR_KEY });

// ---- who is asking ---------------------------------------------------------------------------------
function tokenOf(req: Request): string | null {
  const x = req.headers.get("X-Emby-Token");
  if (x) return x;
  const a = req.headers.get("Authorization") ?? req.headers.get("X-Emby-Authorization") ?? "";
  return /Token="([^"]+)"/i.exec(a)?.[1] ?? null;
}
type Caller = { seerrId: number; manage: boolean; name: string };
async function caller(req: Request): Promise<Caller | null> {
  const tok = tokenOf(req);
  if (!tok) return null;
  let me;
  try { me = await call(JELLYFIN + "/Users/Me", { headers: { Authorization: `MediaBrowser Token="${tok}"` } }); }
  catch { return null; }
  const jf = String(me?.Id ?? "").replace(/-/g, "").toLowerCase();
  const users = (await seerr("/user?take=1000"))?.results ?? [];
  const u = users.find((x: any) => String(x.jellyfinUserId ?? "").replace(/-/g, "").toLowerCase() === jf);
  if (!u) return null;
  return { seerrId: u.id, manage: (u.permissions & (ADMIN | MANAGE_REQUESTS)) !== 0, name: u.displayName };
}

// ---- what may be cancelled -------------------------------------------------------------------------
async function details(type: string, tmdbId: number) {
  if (type !== "movie" && type !== "tv") throw new Error("bad type");
  return await seerr(`/${type}/${tmdbId}`);
}
function targets(c: Caller, info: any): any[] {
  if (!info || info.status === AVAILABLE) return [];
  const reqs = (info.requests ?? []).filter((r: any) => !r.is4k);
  return c.manage ? reqs : reqs.filter((r: any) => r.requestedBy?.id === c.seerrId && r.status === PENDING);
}

// ---- Radarr / Sonarr --------------------------------------------------------------------------------
async function arrOf(kind: "radarr" | "sonarr") {
  const list = await seerr(`/settings/${kind}`);
  const s = (list ?? []).find((x: any) => x.isDefault && !x.is4k) ?? (list ?? []).find((x: any) => !x.is4k);
  if (!s) return null;
  const base = `${s.useSsl ? "https" : "http"}://${s.hostname}:${s.port}${s.baseUrl ?? ""}/api/v3`;
  return (path: string, init: RequestInit = {}) => call(base + path, { ...init, key: s.apiKey });
}
async function removeQueue(arr: (p: string, i?: RequestInit) => Promise<any>, items: any[]) {
  const ids = items.map((q: any) => q.id);
  if (!ids.length) return 0;
  await arr("/queue/bulk?removeFromClient=true&blocklist=false", { method: "DELETE", body: JSON.stringify({ ids }) });
  return ids.length;
}
async function stopMovie(tmdbId: number): Promise<string> {
  const arr = await arrOf("radarr"); if (!arr) return "no Radarr";
  const m = (await arr(`/movie?tmdbId=${tmdbId}`))?.[0];
  if (!m) return "not in Radarr";
  if (m.hasFile) return "kept in Radarr (already downloaded)";
  const q = await removeQueue(arr, (await arr(`/queue/details?movieId=${m.id}`)) ?? []);
  await arr(`/movie/${m.id}?deleteFiles=false&addImportExclusion=false`, { method: "DELETE" });
  return `removed from Radarr (${q} download${q === 1 ? "" : "s"} stopped)`;
}
async function stopShow(tmdbId: number, tvdbId: number | undefined, seasons: number[], whole: boolean): Promise<string> {
  const arr = await arrOf("sonarr"); if (!arr) return "no Sonarr";
  const all = (await arr("/series")) ?? [];
  const s = all.find((x: any) => (tvdbId && x.tvdbId === tvdbId) || x.tmdbId === tmdbId);
  if (!s) return "not in Sonarr";
  const queue = ((await arr(`/queue/details?seriesId=${s.id}&includeEpisode=true`)) ?? []);
  const files = s.statistics?.episodeFileCount ?? 0;
  if (whole && files === 0) {
    const q = await removeQueue(arr, queue);
    await arr(`/series/${s.id}?deleteFiles=false&addImportListExclusion=false`, { method: "DELETE" });
    return `removed from Sonarr (${q} download${q === 1 ? "" : "s"} stopped)`;
  }
  // part of the show is already there: only the cancelled seasons stop
  const want = new Set(seasons);
  const q = await removeQueue(arr, queue.filter((x: any) => want.has(x.seasonNumber ?? x.episode?.seasonNumber)));
  const full = await arr(`/series/${s.id}`);
  let changed = false;
  for (const se of full.seasons ?? []) if (want.has(se.seasonNumber) && se.monitored) { se.monitored = false; changed = true; }
  if (changed) await arr(`/series/${s.id}`, { method: "PUT", body: JSON.stringify(full) });
  return `season${want.size === 1 ? "" : "s"} ${[...want].join(", ")} unmonitored in Sonarr (${q} download${q === 1 ? "" : "s"} stopped)`;
}

async function cancel(c: Caller, type: string, tmdbId: number) {
  const d = await details(type, tmdbId);
  const info = d?.mediaInfo;
  const list = targets(c, info);
  if (!list.length) return json({ ok: false, message: "Nothing you can cancel here." }, 403);
  const approved = list.some((r: any) => r.status === APPROVED);
  for (const r of list) await seerr(`/request/${r.id}`, { method: "DELETE" });
  const left = (info.requests ?? []).filter((r: any) => !r.is4k && !list.some((x: any) => x.id === r.id));
  let arr = "nothing sent to " + (type === "movie" ? "Radarr" : "Sonarr") + " yet";
  if (approved) {
    if (type === "movie") arr = left.length ? "kept (someone else requested it too)" : await stopMovie(tmdbId);
    else {
      const seasons = [...new Set(list.flatMap((r: any) => (r.seasons ?? []).map((s: any) => s.seasonNumber)))] as number[];
      arr = await stopShow(tmdbId, info.tvdbId, seasons, !left.length && info.status !== 4);
    }
  }
  // nothing requested and nothing in the library any more: forget the title so it shows "Request" again
  if (!left.length && info.status !== 4 && info.status !== AVAILABLE) {
    try { await seerr(`/media/${info.id}`, { method: "DELETE" }); } catch (e) { log("media reset failed", String(e)); }
  }
  log(`${c.name} cancelled ${type} ${tmdbId}: ${list.length} request(s); ${arr}`);
  return json({ ok: true, removed: list.length, arr });
}

Deno.serve({ port: PORT, hostname: "0.0.0.0" }, async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  const url = new URL(req.url);
  try {
    if (url.pathname === "/health") return json({ ok: true });
    const c = await caller(req);
    if (!c) return json({ ok: false, message: "Not signed in to Seerr." }, 401);
    if (req.method === "GET" && url.pathname === "/can-cancel") {
      const d = await details(url.searchParams.get("type") ?? "", Number(url.searchParams.get("tmdbId")));
      return json({ can: targets(c, d?.mediaInfo).length > 0 });
    }
    if (req.method === "POST" && url.pathname === "/cancel") {
      const b = await req.json();
      return await cancel(c, String(b.type), Number(b.tmdbId));
    }
    return json({ ok: false, message: "Not found" }, 404);
  } catch (e) {
    log("error", String(e));
    return json({ ok: false, message: "Couldn't cancel: " + String((e as Error).message ?? e) }, 500);
  }
});
log(`IvanaFin Seerr helper on :${PORT} (Seerr ${SEERR}, Jellyfin ${JELLYFIN})`);
