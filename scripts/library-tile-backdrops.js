// IvanaFin parity (7): Home "My Media" tiles show a random backdrop from that library with the
// library name on top - a new pick every visit. The next pick is preloaded while you're on Home,
// so the swap is instant (like IvanaFin's tile backdrops).
(function () {
  'use strict';
  var STYLE_ID = 'ivf-tile-style';
  var STORE = 'ivf-tile-next';
  var next = {};      // libraryId -> { url } preloaded for the next visit
  var current = {};   // libraryId -> url shown now (avoid repeating it next time)
  var noPics = {};    // libraryId -> true when the library has no backdrops (e.g. an empty library): leave its own tile alone
  // Picks preloaded in the last session, so the tiles show a picture immediately at app start
  var stored = {};
  try { stored = JSON.parse(localStorage.getItem(STORE) || '{}') || {}; } catch (e) { stored = {}; }
  function remember(libId, url) {
    try { stored[libId] = url; localStorage.setItem(STORE, JSON.stringify(stored)); } catch (e) {}
  }

  function addStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = [
      '.ivf-tile{position:absolute;inset:0;z-index:2;overflow:hidden;border-radius:inherit;background:#000;container-type:inline-size;pointer-events:none}',
      '.ivf-tile-img{position:absolute;inset:0;background-size:cover;background-position:center;opacity:0;transition:opacity .35s ease}',
      '.ivf-tile-img.ivf-on{opacity:1}',
      '.ivf-tile-shade{position:absolute;inset:0;background:rgba(0,0,0,.28)}',
      '.ivf-tile-name{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;text-align:center;padding:0 6%;',
      'color:#fff;font-weight:700;font-size:13cqw;line-height:1.05;text-shadow:0 2px 12px rgba(0,0,0,.85),0 0 3px rgba(0,0,0,.6)}',
      // Same size on every tile; a long name wraps onto a second line instead of shrinking
      '.ivf-tile-name span{display:block;max-width:100%;white-space:normal;overflow-wrap:break-word}'
    ].join('');
    document.head.appendChild(s);
  }

  function isLibraryCard(card) {
    var t = card.getAttribute('data-type');
    return t === 'CollectionFolder' || t === 'UserView' || t === 'Folder';
  }

  function cardName(card) {
    var el = card.querySelector('.cardText-first, .cardText');
    return (el && el.textContent.trim()) || card.getAttribute('data-name') || '';
  }

  function pickFor(libId) {
    var userId = ApiClient.getCurrentUserId();
    var base = { ParentId: libId, Recursive: true, SortBy: 'Random', Limit: 2, ImageTypes: 'Backdrop', EnableImageTypes: 'Backdrop', EnableUserData: false };
    function query(types) {
      var q = Object.assign({}, base);
      if (types) q.IncludeItemTypes = types;
      return ApiClient.getItems(userId, q).then(function (r) { return (r && r.Items) || []; });
    }
    // Music libraries: a random album cover (square, fits the tile) - same as Android
    // A cover's average colour, from the blurhash Jellyfin keeps for it (characters 2-5 = the average
    // colour as a base-83 number): near-black covers (e.g. Donda) make the tile a plain black box
    var B83 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz#$%*+,-.:;=?@[]^_{|}~';
    function nearBlack(i) {
      var h = i.ImageBlurHashes && i.ImageBlurHashes.Primary && i.ImageBlurHashes.Primary[i.ImageTags.Primary];
      if (!h || h.length < 6) return false;
      var v = 0;
      for (var k = 2; k < 6; k++) { var x = B83.indexOf(h.charAt(k)); if (x < 0) return false; v = v * 83 + x; }
      var r = (v >> 16) & 255, g = (v >> 8) & 255, b = v & 255;
      return 0.2126 * r + 0.7152 * g + 0.0722 * b < 45; // (45 since round 5: WAR, 43, showed as a black square with a faint word)
    }
    function albumCovers() {
      return ApiClient.getItems(userId, { ParentId: libId, Recursive: true, SortBy: 'Random', Limit: 8, IncludeItemTypes: 'MusicAlbum', ImageTypes: 'Primary', EnableImageTypes: 'Primary', EnableUserData: false })
        .then(function (r) {
          var all = ((r && r.Items) || []).filter(function (i) { return i.ImageTags && i.ImageTags.Primary; });
          var lit = all.filter(function (i) { return !nearBlack(i); });
          return (lit.length ? lit : all).slice(0, 2).map(function (i) {
            return ApiClient.getScaledImageUrl(i.Id, { type: 'Primary', fillWidth: 900, fillHeight: 900, quality: 90, tag: i.ImageTags.Primary });
          });
        });
    }
    // Picture libraries (any photos library): a random photo
    function photos() {
      return ApiClient.getItems(userId, { ParentId: libId, Recursive: true, SortBy: 'Random', Limit: 2, IncludeItemTypes: 'Photo', ImageTypes: 'Primary', EnableUserData: false })
        .then(function (r) {
          return ((r && r.Items) || []).filter(function (i) { return i.ImageTags && i.ImageTags.Primary; }).map(function (i) {
            return ApiClient.getScaledImageUrl(i.Id, { type: 'Primary', maxWidth: 1280, quality: 90, tag: i.ImageTags.Primary });
          });
        });
    }
    return query('Movie,Series').then(function (items) {
      if (items.length) return items;
      return albumCovers().then(function (urls) {
        if (urls.length) return { urls: urls };
        return photos().then(function (p) { return p.length ? { urls: p } : query(null); });
      });
    })
      .then(function (items) {
        if (items.urls) return items.urls.filter(function (u) { return u !== current[libId]; })[0] || items.urls[0];
        var urls = items.filter(function (i) { return i.BackdropImageTags && i.BackdropImageTags.length; })
          .map(function (i) {
            return ApiClient.getScaledImageUrl(i.Id, { type: 'Backdrop', fillWidth: 1280, quality: 90, tag: i.BackdropImageTags[0] });
          });
        // Prefer one that isn't on screen right now
        return urls.filter(function (u) { return u !== current[libId]; })[0] || urls[0] || null;
      });
  }

  function preload(libId) {
    return pickFor(libId).then(function (url) {
      if (!url) return;
      var img = new Image();
      img.onload = function () { next[libId] = { url: url }; remember(libId, url); };
      img.src = url;
    }).catch(function () {});
  }

  function show(layer, url) {
    var img = layer.querySelector('.ivf-tile-img');
    img.style.backgroundImage = 'url("' + url + '")';
    var probe = new Image();
    probe.onload = function () { img.classList.add('ivf-on'); };
    probe.src = url; // instant when it was preloaded
  }

  function decorate(card) {
    var libId = card.getAttribute('data-id');
    var box = card.querySelector('.cardScalable');
    if (!libId || !box || noPics[libId] || box.querySelector('.ivf-tile')) return;
    var layer = document.createElement('div');
    layer.className = 'ivf-tile';
    layer.setAttribute('data-lib', libId);
    layer.innerHTML = '<div class="ivf-tile-img"></div><div class="ivf-tile-shade"></div><div class="ivf-tile-name"></div>';
    var name = cardName(card);
    var nameEl = layer.querySelector('.ivf-tile-name');
    var span = document.createElement('span');
    span.textContent = name;
    nameEl.appendChild(span);
    box.appendChild(layer);

    var ready = next[libId] || (stored[libId] ? { url: stored[libId] } : null);
    delete next[libId];
    delete stored[libId];
    var shown = ready ? Promise.resolve(ready.url) : pickFor(libId);
    shown.then(function (url) {
      // no backdrops: keep the library's own picture, and remember so the watcher doesn't re-add the layer in a loop
      if (!url) { noPics[libId] = true; layer.remove(); return; }
      current[libId] = url;
      show(layer, url);
      preload(libId); // next visit's picture, loaded in the background
    }).catch(function () { noPics[libId] = true; layer.remove(); });
  }

  // Leaving Home (called by home-grid.js): every library tile takes its next, already downloaded
  // picture now, out of sight. Jellyfin keeps its Home page between visits, so the tiles only got
  // new pictures when it happened to rebuild them - mostly never on the TV.
  // The pictures after that are fetched a few seconds later: fetched at once, their 9 queries and 7
  // big pictures went out together with the page being opened (Samsung: Movies library waited on them)
  var preloadTimer = null, preloadIds = {};
  function advance() {
    Array.prototype.forEach.call(document.querySelectorAll('.ivf-tile[data-lib]'), function (layer) {
      var id = layer.getAttribute('data-lib'), n = next[id];
      if (!n) return;
      delete next[id];
      current[id] = n.url;
      show(layer, n.url);
      preloadIds[id] = 1; // and the one after that (below)
    });
    clearTimeout(preloadTimer);
    preloadTimer = setTimeout(function () {
      var ids = Object.keys(preloadIds);
      preloadIds = {};
      ids.forEach(preload);
    }, 3000);
  }
  window.IvfTileBackdrops = { advance: advance };

  function scan() {
    if (typeof ApiClient === 'undefined' || !ApiClient.getCurrentUserId || !ApiClient.getCurrentUserId()) return;
    var home = document.querySelector('.homeSectionsContainer');
    if (!home) return;
    var cards = home.querySelectorAll('.card[data-id]');
    for (var i = 0; i < cards.length; i++) {
      if (isLibraryCard(cards[i])) { addStyle(); decorate(cards[i]); }
    }
  }

  // One page watcher shared by all IvanaFin scripts (each used to watch the whole page on its own,
  // which added up on the Samsung TV). Whichever script loads first creates it.
  var ivfWatch = window.IvfWatch || (window.IvfWatch = (function () {
    var subs = [];
    new MutationObserver(function (recs) {
      // (the Music player's own clock / lyrics updates every second don't concern the other scripts)
      for (var j = 0; j < recs.length; j++) if (!recs[j].target.closest || !recs[j].target.closest('#ivf-music')) break;
      if (j === recs.length) return;
      for (var i = 0; i < subs.length; i++) subs[i]();
    }).observe(document.documentElement, { childList: true, subtree: true });
    return function (fn, ms) {
      var queued = false;
      subs.push(function () {
        if (queued) return;
        queued = true;
        setTimeout(function () { queued = false; fn(); }, ms);
      });
    };
  })());
  ivfWatch(function () { scan(); }, 50);
  scan();
})();
