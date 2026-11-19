// IvanaFin query-cache saver (performance, 2026-11-18): Jellyfin web keeps a copy of its data cache in the
// browser's storage (IndexedDB "keyval-store", key "jellyfin-query-cache") so the next start can show things
// at once. It rewrites the WHOLE copy (2.3 MB, 176 queries) every time any one query changes - about 26 times
// in the first 15 s of a start, ~120 ms of blocked screen each on the Samsung (most of the slow start).
// Here only the newest copy is kept and written once things go quiet (5 s, at most every 30 s), and when the
// app is hidden or closed. The copy also keeps only the 60 most recently updated queries (the rest are simply
// fetched again when needed), so reading it back at start is cheaper too.
(function () {
  'use strict';
  if (window.__ivfQueryCacheSaver) return;
  window.__ivfQueryCacheSaver = true;
  if (!window.IDBObjectStore) return;

  var KEY = 'jellyfin-query-cache', KEEP = 60, QUIET = 5000, MAX_WAIT = 30000;
  var realPut = IDBObjectStore.prototype.put;
  var pending = null, db = null, store = '', timer = 0, firstAt = 0;

  function trim(v) {
    try {
      var qs = v && v.clientState && v.clientState.queries;
      if (qs && qs.length > KEEP) {
        qs = qs.slice().sort(function (a, b) {
          return ((b.state && b.state.dataUpdatedAt) || 0) - ((a.state && a.state.dataUpdatedAt) || 0);
        }).slice(0, KEEP);
        var cs = {}; for (var k in v.clientState) cs[k] = v.clientState[k];
        cs.queries = qs;
        var out = {}; for (var j in v) out[j] = v[j];
        out.clientState = cs;
        return out;
      }
    } catch (e) {}
    return v;
  }

  function flush() {
    clearTimeout(timer); timer = 0; firstAt = 0;
    if (!pending || !db) return;
    var v = pending; pending = null;
    try { realPut.call(db.transaction(store, 'readwrite').objectStore(store), trim(v), KEY); } catch (e) {}
  }

  IDBObjectStore.prototype.put = function (value, key) {
    if (key !== KEY) return realPut.apply(this, arguments);
    // the caller only waits for its transaction to finish; with no request in it, it finishes right away
    pending = value; db = this.transaction.db; store = this.name;
    var now = Date.now();
    if (!firstAt) firstAt = now;
    clearTimeout(timer);
    timer = setTimeout(flush, Math.max(0, Math.min(QUIET, firstAt + MAX_WAIT - now)));
    return null;
  };

  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') flush(); });
  window.addEventListener('pagehide', flush);
})();
