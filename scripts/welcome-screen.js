// IvanaFin welcome screen: shown once per app session while Home loads (icon font, library tile
// pictures, "+ Discover" tab). The cat (welcome-cat-source.jpg), "Welcome to IvanaFin", a random fun line and bouncing dots;
// at least 5s (time for the app to finish loading), never more than 10s, then fades into Home.
(function () {
  'use strict';
  var KEY = 'ivf-welcome-done';
  // The Samsung IvanaFin app draws the same welcome screen from its first frame (#ivf-welcome-static);
  // this script takes it over. Anywhere it isn't wanted, remove that copy.
  var staticEl = document.getElementById('ivf-welcome-static');
  window.__ivfWelcomeAdopted = true;
  function dropStatic() {
    if (!staticEl || !staticEl.parentNode) return;
    staticEl.classList.add('ivf-out');
    setTimeout(function () { staticEl.remove(); }, 500);
  }
  var seen = false;
  try { seen = !!sessionStorage.getItem(KEY); sessionStorage.setItem(KEY, '1'); } catch (e) {}
  var h = location.hash || '';
  var isHome = h === '' || h === '#' || h === '#/' || /^#\/home(\.html)?(\?|$)/.test(h);
  if (seen || !isHome) { dropStatic(); return; }

  var CAT = 'data:image/jpeg;base64,__IVF_CAT_B64__';
  var LINES = [
    'Fluffing the cushions…',
    'Dimming the lights…',
    'Popping the popcorn…',
    'Chasing the remote under the sofa…',
    'Warming up the projector…',
    'Finding the comfy blanket…',
    'Shooing the cat off the remote…',
    'Rolling out the red carpet…',
    'Queueing up something good…',
    'Putting the kettle on…'
  ];
  var greeting = 'Welcome to IvanaFin';

  var style = document.createElement('style');
  style.textContent = [
    '.ivf-welcome{position:fixed;inset:0;z-index:2147483000;background:#000;display:flex;flex-direction:column;align-items:center;justify-content:center;',
    'gap:4vh;opacity:1;transition:opacity .45s ease;font-family:inherit;color:#fff;pointer-events:none}',
    '.ivf-welcome.ivf-out{opacity:0}',
    '.ivf-welcome-glow{position:absolute;width:95vh;height:95vh;border-radius:50%;background:radial-gradient(circle,rgba(0,164,220,.18) 0%,transparent 65%);',
    'animation:ivfGlow 3s ease-in-out infinite}',
    '.ivf-welcome-cat{position:relative;width:44vh;height:44vh;border-radius:50%;background:center/cover no-repeat;',
    'box-shadow:0 0 0 .8vh rgba(255,255,255,.9),0 1.5vh 6vh rgba(0,0,0,.8);animation:ivfBreathe 2.6s ease-in-out infinite, ivfIn .6s ease-out both}',
    '.ivf-welcome-hi{position:relative;font-size:8.5vh;font-weight:700;letter-spacing:.02em;animation:ivfIn .6s .15s ease-out both}',
    '.ivf-welcome-line{position:relative;font-size:4.2vh;opacity:.8;min-height:5.4vh;animation:ivfIn .6s .3s ease-out both;transition:opacity .3s}',
    '.ivf-welcome-dots{position:relative;display:flex;gap:2vh;margin-top:1.5vh;animation:ivfIn .6s .45s ease-out both}',
    '.ivf-welcome-dots span{width:2.2vh;height:2.2vh;border-radius:50%;background:#fff;animation:ivfDot 1.2s ease-in-out infinite}',
    '.ivf-welcome-dots span:nth-child(2){animation-delay:.15s}',
    '.ivf-welcome-dots span:nth-child(3){animation-delay:.3s}',
    '@keyframes ivfBreathe{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}',
    '@keyframes ivfGlow{0%,100%{transform:scale(.9);opacity:.7}50%{transform:scale(1.1);opacity:1}}',
    '@keyframes ivfDot{0%,80%,100%{transform:translateY(0);opacity:.35}40%{transform:translateY(-2vh);opacity:1}}',
    '@keyframes ivfIn{from{opacity:0;transform:translateY(2vh)}to{opacity:1;transform:none}}'
  ].join('');
  (document.head || document.documentElement).appendChild(style);

  var el = staticEl;
  if (!el) {
    el = document.createElement('div');
    el.className = 'ivf-welcome';
    el.innerHTML = '<div class="ivf-welcome-glow"></div>' +
      '<div class="ivf-welcome-cat" style="background-image:url(\'' + CAT + '\')"></div>' +
      '<div class="ivf-welcome-hi"></div>' +
      '<div class="ivf-welcome-line"></div>' +
      '<div class="ivf-welcome-dots"><span></span><span></span><span></span></div>';
    document.documentElement.appendChild(el); // outside <body>, which the app rebuilds while starting
  }
  var hi = el.querySelector('.ivf-welcome-hi');
  var lineEl = el.querySelector('.ivf-welcome-line');
  hi.textContent = greeting;
  var lineIdx = Math.max(0, LINES.indexOf(lineEl.textContent));
  if (!lineEl.textContent) { lineIdx = Math.floor(Math.random() * LINES.length); lineEl.textContent = LINES[lineIdx]; }
  var lineTimer = setInterval(function () {
    lineEl.style.opacity = '0';
    setTimeout(function () {
      lineIdx = (lineIdx + 1 + Math.floor(Math.random() * (LINES.length - 1))) % LINES.length;
      lineEl.textContent = LINES[lineIdx];
      lineEl.style.opacity = '';
    }, 300);
  }, 2200);

  var start = window.__ivfWelcomeStart || Date.now(); // the Samsung app records when it was opened
  var fontsReady = !(document.fonts && document.fonts.ready);
  if (!fontsReady) document.fonts.ready.then(function () { fontsReady = true; });

  function tilesReady() {
    var tiles = document.querySelectorAll('.homeSectionsContainer .ivf-tile');
    if (!tiles.length) return false;
    for (var i = 0; i < tiles.length; i++) {
      if (!tiles[i].querySelector('.ivf-tile-img.ivf-on')) return false;
    }
    return true;
  }

  var done = false;
  function finish() {
    if (done) return;
    done = true;
    clearInterval(lineTimer);
    el.classList.add('ivf-out');
    setTimeout(function () { el.remove(); style.remove(); }, 500);
  }
  (function tick() {
    if (done) return;
    var t = Date.now() - start;
    var discover = !!document.getElementById('je-native-tab-btn-recommendations') || t > 4500;
    if ((t > 5000 && fontsReady && tilesReady() && discover) || t > 10000) { finish(); return; }
    setTimeout(tick, 100);
  })();
})();
