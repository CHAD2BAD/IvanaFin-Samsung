// IvanaFin parity (9): clicking an episode plays it (resuming where you left off) instead of
// opening the episode page. Uses jellyfin-web's own item actions: episode cards/list rows are
// switched from data-action="link" to "resume" and given their resume position. The menu
// button / long-press still opens the episode's options (including going to its page).
(function () {
  'use strict';
  var pending = {}; // episodeId -> true while its user data is being fetched

  function switchToResume(root, ticks) {
    var els = [root].concat(Array.prototype.slice.call(root.querySelectorAll('[data-action]')));
    els.forEach(function (el) {
      if (el.getAttribute('data-action') === 'link') el.setAttribute('data-action', 'resume');
      if (el === root || el.classList.contains('itemAction')) el.setAttribute('data-positionticks', String(ticks || 0));
    });
    // Elements with the itemAction class but no own data-action read the card's
    root.querySelectorAll('.itemAction').forEach(function (el) { el.setAttribute('data-positionticks', String(ticks || 0)); });
    root.setAttribute('data-ivf-play', '1');
  }

  function scan() {
    if (typeof ApiClient === 'undefined' || !ApiClient.getCurrentUserId || !ApiClient.getCurrentUserId()) return;
    var nodes = document.querySelectorAll('[data-type="Episode"][data-id]:not([data-ivf-play])');
    var byId = {};
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      // Only item cards / list rows that would navigate (not the player's queue etc.)
      if (!n.matches('.card, .listItem')) continue;
      var link = n.getAttribute('data-action') === 'link' || n.querySelector('[data-action="link"]');
      if (!link) { n.setAttribute('data-ivf-play', 'skip'); continue; }
      var id = n.getAttribute('data-id');
      (byId[id] = byId[id] || []).push(n);
    }
    var ids = Object.keys(byId).filter(function (id) { return !pending[id]; });
    if (!ids.length) return;
    ids.forEach(function (id) { pending[id] = true; });
    ApiClient.getItems(ApiClient.getCurrentUserId(), { Ids: ids.join(','), EnableUserData: true, EnableImages: false })
      .then(function (r) {
        var ticks = {};
        ((r && r.Items) || []).forEach(function (it) {
          var ud = it.UserData || {};
          ticks[it.Id] = ud.Played ? 0 : (ud.PlaybackPositionTicks || 0);
        });
        ids.forEach(function (id) {
          (byId[id] || []).forEach(function (n) { if (n.isConnected) switchToResume(n, ticks[id] || 0); });
        });
      })
      .catch(function () {})
      .then(function () { ids.forEach(function (id) { delete pending[id]; }); });
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
  ivfWatch(function () { scan(); }, 100);
  scan();
})();
