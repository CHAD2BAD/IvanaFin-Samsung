// IvanaFin for Jellyfin web: runs before the IvanaFin scripts (built into ivanafin.js).
// - The IvanaFin look (ElegantFin theme + its colours) comes with it, so nothing else is needed.
// - Discover appears when the server also has the Jellyfin Enhanced plugin (+ Seerr); that plugin puts
//   its own script into Jellyfin web, so nothing is loaded for it here.
(function () {
  'use strict';
  window.IvfBuild = 'web';

  var css = document.createElement('style');
  css.id = 'ivf-public-theme';
  css.textContent = '@import url("https://cdn.jsdelivr.net/gh/lscambo13/ElegantFin@main/Theme/ElegantFin-jellyfin-theme-build-latest-minified.css");' +
    ':root{--darkerGradientPoint:hsla(0,0%,0%,1);--darkerGradientPointAlpha:hsla(0,0%,0%,.85);' +
    '--lighterGradientPoint:hsla(0,0%,0%,1);--lighterGradientPointAlpha:hsla(0,0%,7%,.85);' +
    '--headerColor:hsla(0,0%,0%,.8);--drawerColor:hsla(0,0%,0%,.9);' +
    '--headerColorGradient:linear-gradient(180deg,hsla(0,0%,0%,.95) 30%,55%,transparent 90%);' +
    '--borderColor:hsla(0,0%,32%,1);--darkerBorderColor:hsla(0,0%,22%,1);--lighterBorderColor:hsla(0,0%,100%,.2);' +
    '--selectorBackgroundColor:hsla(0,0%,27%,1);--selectorBackgroundColorAlpha:hsla(0,0%,27%,.5);' +
    '--btnMiniPlayColor:hsla(0,0%,0%,.8);--btnMiniPlayBorderColor:hsla(0,0%,30%,.8)}';
  (document.head || document.documentElement).appendChild(css);
})();
