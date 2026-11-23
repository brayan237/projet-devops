/* ==========================================================================
   STORM & SMOKE — moteur de fumée, éclairs procéduraux, thèmes, navigation
   JavaScript vanilla ES6+, aucune dépendance.
   ========================================================================== */
(() => {
  'use strict';

  /* ------------------------------------------------------------------ *
   *  Données
   * ------------------------------------------------------------------ */
  const COLOR_MS = 600; // durée de la transition chromatique

  const THEMES = [
    { name: 'Électrique Cyan & Bleu Glace', c1: [0, 243, 255],   c2: [0, 102, 255] },
    { name: 'Magenta & Violet Plasma',      c1: [255, 0, 234],   c2: [112, 0, 255] },
    { name: 'Or Solaire & Ambre',           c1: [255, 174, 0],   c2: [255, 69, 0] },
    { name: 'Émeraude & Vert Toxique',      c1: [0, 255, 136],   c2: [0, 143, 76] },
    { name: 'Rouge Cramoisi & Rubis',       c1: [255, 30, 66],   c2: [139, 0, 0] },
    { name: 'Blanc Lunaire & Argent',       c1: [224, 247, 255], c2: [122, 155, 184] }
  ];

  // Chaque photo a son thème (deux photos voisines n'ont jamais le même)
  const PHOTOS = [
    { src: 'images/itachi.jpg',         title: 'Le Corbeau de la Pluie', caption: 'Sous l’averse, le regard rouge ne cligne jamais.',   theme: 4, pos: '50% 30%' },
    { src: 'images/kaneki.jpg',         title: 'Kagune Écarlate',        caption: 'La nuit de la ville s’ouvre sur des ailes de sang.',  theme: 5, pos: '50% 35%' },
    { src: 'images/sasuke.jpg',         title: 'Squelette de Foudre',    caption: 'Une aura violette, un silence qui crépite.',          theme: 1, pos: '50% 50%' },
    { src: 'images/jinwoo-artwork.jpg', title: 'Monarque des Braises',   caption: 'Le feu se plie devant celui qui ne recule pas.',      theme: 2, pos: '50% 40%' },
    { src: 'images/jinwoo-dagger.jpg',  title: 'Danse des Dagues',       caption: 'Deux lames, un éclat de glace, zéro hésitation.',     theme: 0, pos: '50% 45%' },
    { src: 'images/tanjiro.jpg',        title: 'Le Feu dans le Regard',  caption: 'Une braise dorée au cœur d’une mer bleue.',           theme: 3, pos: '50% 45%' },
    { src: 'images/yuji-1.jpg',         title: 'Néon Maudit',            caption: 'Rose électrique, cyan glacé : le chaos en sérigraphie.', theme: 1, pos: '50% 40%' },
    { src: 'images/yuji-2.jpg',         title: 'Sourire du Fléau',       caption: 'Le sourire qui précède la tempête.',                  theme: 0, pos: '50% 35%' }
  ];
  const N = PHOTOS.length;

  /* ------------------------------------------------------------------ *
   *  Utilitaires
   * ------------------------------------------------------------------ */
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const rand = (a, b) => a + Math.random() * (b - a);
  const randInt = (a, b) => Math.floor(rand(a, b + 1));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const pad = n => String(n).padStart(2, '0');
  const rgb = c => `${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])}`;
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------------ *
   *  Références DOM
   * ------------------------------------------------------------------ */
  const root = document.documentElement;
  const cardWrap = $('#card-wrap');
  const card = $('#card');
  const photoEl = $('#photo');
  const layers = [$('#layer-a'), $('#layer-b')];
  const ambs = Array.from(document.querySelectorAll('.amb'));
  const shockEl = $('#shock');
  const flashEl = $('#flash');
  const infoEl = $('#info');
  const titleEl = $('#title');
  const captionEl = $('#caption');
  const curEl = $('#cur');
  const totEl = $('#tot');
  const progressEl = $('#progress');
  const dotsEl = $('#dots');
  const loaderEl = $('#loader');
  const smokeC = $('#smoke-canvas');
  const lightC = $('#lightning-canvas');
  const sctx = smokeC.getContext('2d');
  const lctx = lightC.getContext('2d');

  /* ------------------------------------------------------------------ *
   *  Système de couleurs dynamiques (transition de 600 ms)
   * ------------------------------------------------------------------ */
  const cur = { c1: THEMES[PHOTOS[0].theme].c1.slice(), c2: THEMES[PHOTOS[0].theme].c2.slice() };
  const tween = { active: false, t0: 0, from: null, to: null };

  function applyColors() {
    root.style.setProperty('--c1', `rgb(${rgb(cur.c1)})`);
    root.style.setProperty('--c2', `rgb(${rgb(cur.c2)})`);
    root.style.setProperty('--c1-rgb', rgb(cur.c1));
    root.style.setProperty('--c2-rgb', rgb(cur.c2));
  }

  function setTheme(index, instant) {
    const t = THEMES[index];
    if (instant) {
      cur.c1 = t.c1.slice();
      cur.c2 = t.c2.slice();
      tween.active = false;
      applyColors();
      return;
    }
    tween.from = { c1: cur.c1.slice(), c2: cur.c2.slice() };
    tween.to = t;
    tween.t0 = performance.now();
    tween.active = true;
  }

  function stepColors(now) {
    if (!tween.active) return;
    const k = ease(clamp((now - tween.t0) / COLOR_MS, 0, 1));
    for (let j = 0; j < 3; j++) {
      cur.c1[j] = lerp(tween.from.c1[j], tween.to.c1[j], k);
      cur.c2[j] = lerp(tween.from.c2[j], tween.to.c2[j], k);
    }
    applyColors();
    if (k >= 1) tween.active = false;
  }

  /* ------------------------------------------------------------------ *
   *  Canvas : dimensionnement
   * ------------------------------------------------------------------ */
  const SC = 0.7; // la fumée est floue : on la rend à 70 % pour économiser du fill-rate
  let W = 0;
  let H = 0;
  let DPR = 1;

  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    DPR = Math.min(window.devicePixelRatio || 1, 2);

    smokeC.width = Math.max(1, Math.round(W * SC));
    smokeC.height = Math.max(1, Math.round(H * SC));
    sctx.setTransform(SC, 0, 0, SC, 0, 0);

    lightC.width = Math.max(1, Math.round(W * DPR));
    lightC.height = Math.max(1, Math.round(H * DPR));
    lctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  let resizeRaf = 0;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(resize);
  });

  /* ------------------------------------------------------------------ *
   *  Fumée volumétrique (particules + textures radiales hors-écran)
   * ------------------------------------------------------------------ */
  const SPR = 128;

  function makeSprite() {
    const c = document.createElement('canvas');
    c.width = c.height = SPR;
    const g = c.getContext('2d');
    const r = SPR / 2;
    const blob = (x, y, rad, a) => {
      const gr = g.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, `rgba(255,255,255,${a})`);
      gr.addColorStop(0.45, `rgba(255,255,255,${a * 0.45})`);
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr;
      g.beginPath();
      g.arc(x, y, rad, 0, Math.PI * 2);
      g.fill();
    };
    blob(r, r, r * 0.95, 0.55);
    for (let i = 0; i < 6; i++) {
      const a = rand(0, Math.PI * 2);
      const d = rand(0.1, 0.45) * r;
      blob(r + Math.cos(a) * d, r + Math.sin(a) * d, rand(0.3, 0.55) * r, rand(0.25, 0.5));
    }
    return c;
  }

  const sprites = [makeSprite(), makeSprite(), makeSprite(), makeSprite()];

  const smoke = { parts: [], dense: false, boost: 0, flash: 0 };

  function targetCount() {
    let n = clamp(Math.round((W * H) / (1920 * 1080) * 54 + 20), 28, 76);
    if (smoke.dense) n = Math.round(n * 1.9);
    if (reduceMotion) n = Math.round(n * 0.5);
    return n;
  }

  function newParticle(initial) {
    const z = Math.random();
    const mode = z < 0.36 ? 0 : z < 0.72 ? 1 : 2; // 0 gauche, 1 droite, 2 bas
    const sc = clamp(Math.max(W, H) / 1500, 0.6, 1.3);
    const p = {
      mode,
      s0: rand(70, 150) * sc,
      speed: rand(38, 95) * clamp(H / 900, 0.7, 1.3) * (reduceMotion ? 0.5 : 1),
      life: rand(8, 15),
      amp: rand(18, 60),
      freq: rand(0.25, 0.7),
      ph: rand(0, Math.PI * 2),
      rot: rand(0, Math.PI * 2),
      vr: rand(-0.18, 0.18),
      maxA: rand(0.14, 0.35),
      spr: sprites[randInt(0, sprites.length - 1)],
      drift: mode === 0 ? rand(2, 10) : mode === 1 ? -rand(2, 10) : 0,
      age: 0
    };
    p.s1 = p.s0 * rand(2.2, 3.4);
    if (mode === 0) p.bx = rand(-0.05, 0.14) * W;
    else if (mode === 1) p.bx = rand(0.86, 1.05) * W;
    else p.bx = rand(-0.05, 1.05) * W;
    p.y = mode === 2 ? H + rand(0, 0.06) * H : rand(0.7, 1.12) * H;
    if (initial) {
      p.age = rand(0, p.life);
      p.y -= p.speed * p.age;
      p.bx += p.drift * p.age;
    }
    return p;
  }

  function drawSmoke(dt, t) {
    smoke.boost *= Math.exp(-dt * 1.5);
    smoke.flash *= Math.exp(-dt * 5);

    const target = targetCount();
    const parts = smoke.parts;
    let add = 0;
    while (parts.length < target && add < 2) {
      parts.push(newParticle(false));
      add++;
    }

    sctx.setTransform(1, 0, 0, 1, 0, 0);
    sctx.globalCompositeOperation = 'source-over';
    sctx.globalAlpha = 1;
    sctx.clearRect(0, 0, smokeC.width, smokeC.height);

    const mult = 1 + smoke.boost * 2.6;

    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.age += dt;
      if (p.age >= p.life) {
        if (parts.length > target) parts.splice(i, 1);
        else parts[i] = newParticle(false);
        continue;
      }
      p.y -= p.speed * mult * dt;
      p.bx += p.drift * dt;
      p.rot += p.vr * dt;

      const u = p.age / p.life;
      const x = p.bx + Math.sin(t * p.freq + p.ph) * p.amp * (0.4 + u);
      const size = lerp(p.s0, p.s1, u * (0.6 + 0.4 * u));

      // La fumée reste sur les bords gauche / droit / bas, le centre est dégagé
      const ex = Math.abs(x / W - 0.5) * 2;
      const edge = Math.max(smooth(0.52, 0.92, ex), smooth(0.66, 1.0, p.y / H));
      let a = p.maxA * Math.sin(Math.PI * u) * edge * (1 + smoke.flash * 1.6);
      a = Math.min(a, 0.6);
      if (a < 0.004) continue;

      const c = Math.cos(p.rot);
      const s = Math.sin(p.rot);
      const k = (size / SPR) * SC;
      sctx.globalAlpha = a;
      sctx.setTransform(c * k, s * k, -s * k, c * k, x * SC, p.y * SC);
      sctx.drawImage(p.spr, -SPR / 2, -SPR / 2);
    }

    // Teinte : dégradé vertical entre les deux couleurs du thème actif
    sctx.setTransform(SC, 0, 0, SC, 0, 0);
    sctx.globalAlpha = 1;
    sctx.globalCompositeOperation = 'source-atop';
    const g = sctx.createLinearGradient(0, H, 0, 0);
    g.addColorStop(0, `rgb(${rgb(cur.c2)})`);
    g.addColorStop(0.55, `rgb(${rgb(cur.c1)})`);
    g.addColorStop(1, `rgb(${rgb(cur.c1)})`);
    sctx.fillStyle = g;
    sctx.fillRect(0, 0, W, H);
    sctx.globalCompositeOperation = 'source-over';
  }

  /* ------------------------------------------------------------------ *
   *  Éclairs procéduraux (Midpoint Displacement)
   * ------------------------------------------------------------------ */
  const bolts = [];
  let lightDirty = false;

  function midpoint(x1, y1, x2, y2, disp) {
    let pts = [[x1, y1], [x2, y2]];
    let d = disp;
    for (let it = 0; it < 7 && d > 1.2; it++) {
      const out = [pts[0]];
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i];
        const b = pts[i + 1];
        const dx = b[0] - a[0];
        const dy = b[1] - a[1];
        const len = Math.hypot(dx, dy) || 1;
        const off = rand(-d, d);
        out.push([(a[0] + b[0]) / 2 + (-dy / len) * off, (a[1] + b[1]) / 2 + (dx / len) * off], b);
      }
      pts = out;
      d *= 0.55;
    }
    return pts;
  }

  function buildBolt(b) {
    const dist = Math.hypot(b.ex - b.sx, b.ey - b.sy);
    b.main = midpoint(b.sx, b.sy, b.ex, b.ey, dist * 0.18);
    b.branches = [];
    const n = randInt(2, 4);
    const ang = Math.atan2(b.ey - b.sy, b.ex - b.sx);
    for (let i = 0; i < n; i++) {
      const idx = Math.floor(rand(0.12, 0.82) * b.main.length);
      const o = b.main[idx];
      const a = ang + (Math.random() < 0.5 ? -1 : 1) * rand(0.35, 0.95);
      const len = dist * rand(0.1, 0.26);
      b.branches.push({
        pts: midpoint(o[0], o[1], o[0] + Math.cos(a) * len, o[1] + Math.sin(a) * len, len * 0.22),
        w: rand(0.45, 0.7)
      });
    }
  }

  function strike(opts) {
    const r = cardWrap.getBoundingClientRect();
    const count = opts.target ? 1 : (Math.random() < 0.35 ? 2 : 1);
    const sides = Math.random() < 0.5 ? ['L', 'R'] : ['R', 'L'];
    for (let k = 0; k < count; k++) {
      let ex;
      let ey;
      let sx;
      if (opts.target) {
        ex = opts.target.x;
        ey = opts.target.y;
        sx = clamp(ex + rand(-160, 160), 10, W - 10);
      } else {
        ex = sides[k] === 'L' ? r.left + rand(-0.03, 0.05) * r.width : r.right + rand(-0.05, 0.03) * r.width;
        ey = clamp(rand(r.top + r.height * 0.4, r.bottom + r.height * 0.08), 80, H - 20);
        sx = clamp(ex + rand(-0.14, 0.14) * W, 10, W - 10);
      }
      const b = {
        sx, sy: -30, ex, ey,
        born: performance.now() + k * rand(40, 120),
        dur: rand(400, 700),
        seed: rand(0, 100),
        re1: false,
        re2: false
      };
      buildBolt(b);
      bolts.push(b);
    }
    if (bolts.length > 8) bolts.splice(0, bolts.length - 8);
  }

  function tracePath(pts) {
    const p = new Path2D();
    p.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) p.lineTo(pts[i][0], pts[i][1]);
    return p;
  }

  function strokeBolt(pts, w, a, c1, c2) {
    const path = tracePath(pts);
    lctx.shadowColor = `rgb(${c1})`;
    lctx.shadowBlur = 40;
    lctx.strokeStyle = `rgba(${c2},${0.35 * a})`;
    lctx.lineWidth = w * 7;
    lctx.stroke(path);
    lctx.shadowBlur = 22;
    lctx.strokeStyle = `rgba(${c1},${0.85 * a})`;
    lctx.lineWidth = w * 3.2;
    lctx.stroke(path);
    lctx.shadowColor = '#ffffff';
    lctx.shadowBlur = 10;
    lctx.strokeStyle = `rgba(255,255,255,${a})`;
    lctx.lineWidth = w * 1.3;
    lctx.stroke(path);
  }

  function drawLightning(now) {
    if (bolts.length === 0) {
      if (lightDirty) {
        lctx.clearRect(0, 0, W, H);
        lightDirty = false;
      }
      return;
    }
    lctx.clearRect(0, 0, W, H);
    lightDirty = true;
    lctx.globalCompositeOperation = 'lighter';
    lctx.lineJoin = 'round';
    lctx.lineCap = 'round';
    const c1 = rgb(cur.c1);
    const c2 = rgb(cur.c2);

    for (let i = bolts.length - 1; i >= 0; i--) {
      const b = bolts[i];
      if (now < b.born) continue;
      const u = (now - b.born) / b.dur;
      if (u >= 1) { bolts.splice(i, 1); continue; }

      // Ré-amorçages : l'arc "crépite" en changeant de forme
      if (!b.re1 && u > 0.33) { buildBolt(b); b.re1 = true; }
      if (!b.re2 && u > 0.62) { buildBolt(b); b.re2 = true; }

      let a;
      if (u < 0.12) a = 1;
      else {
        a = (Math.sin(u * 60 + b.seed) * 0.5 + 0.5) * 0.55 + 0.4;
        a *= 1 - smooth(0.5, 1, u);
      }

      // Flash plein écran très léger à l'impact
      if (u < 0.25) {
        lctx.fillStyle = `rgba(${c1},${0.07 * (1 - u / 0.25)})`;
        lctx.fillRect(0, 0, W, H);
      }

      strokeBolt(b.main, 1.8, a, c1, c2);
      for (const br of b.branches) strokeBolt(br.pts, 1.8 * br.w, a * 0.75, c1, c2);

      // Étincelle d'impact
      const rad = 110 * (0.5 + a * 0.5);
      const gr = lctx.createRadialGradient(b.ex, b.ey, 0, b.ex, b.ey, rad);
      gr.addColorStop(0, `rgba(255,255,255,${0.7 * a})`);
      gr.addColorStop(0.3, `rgba(${c1},${0.35 * a})`);
      gr.addColorStop(1, `rgba(${c1},0)`);
      lctx.fillStyle = gr;
      lctx.fillRect(b.ex - rad, b.ey - rad, rad * 2, rad * 2);
    }

    lctx.shadowBlur = 0;
    lctx.globalCompositeOperation = 'source-over';
  }

  /* ------------------------------------------------------------------ *
   *  Ambiance sonore synthétisée (Web Audio API, aucun fichier audio)
   * ------------------------------------------------------------------ */
  const Sound = {
    ctx: null,
    master: null,
    noiseWhite: null,
    noiseBrown: null,
    on: false,

    init() {
      if (this.ctx) return true;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      try {
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.7;
        this.master.connect(this.ctx.destination);

        const rate = this.ctx.sampleRate;
        const white = this.ctx.createBuffer(1, Math.floor(rate * 0.3), rate);
        const wd = white.getChannelData(0);
        for (let i = 0; i < wd.length; i++) wd[i] = Math.random() * 2 - 1;
        this.noiseWhite = white;

        const brown = this.ctx.createBuffer(1, Math.floor(rate * 4), rate);
        const bd = brown.getChannelData(0);
        let last = 0;
        for (let i = 0; i < bd.length; i++) {
          const w = Math.random() * 2 - 1;
          last = (last + 0.02 * w) / 1.02;
          bd[i] = last * 3.5;
        }
        this.noiseBrown = brown;
      } catch (e) {
        this.ctx = null;
        return false;
      }
      return true;
    },

    toggle() {
      if (!this.on) {
        if (!this.init()) return false;
        this.on = true;
        if (this.ctx.state === 'suspended') this.ctx.resume();
        this.thunder(0.6);
      } else {
        this.on = false;
      }
      return this.on;
    },

    thunder(power) {
      if (!this.on || !this.ctx) return;
      const ctx = this.ctx;
      if (ctx.state === 'suspended') ctx.resume();
      const t = ctx.currentTime;
      const p = clamp(power || 1, 0.2, 1.4);

      // Craquement initial
      const crack = ctx.createBufferSource();
      crack.buffer = this.noiseWhite;
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 1400;
      const cg = ctx.createGain();
      cg.gain.setValueAtTime(0.0001, t);
      cg.gain.linearRampToValueAtTime(0.35 * p, t + 0.006);
      cg.gain.exponentialRampToValueAtTime(0.0008, t + 0.24);
      crack.connect(hp);
      hp.connect(cg);
      cg.connect(this.master);
      crack.start(t);
      crack.stop(t + 0.3);

      // Grondement
      const d = rand(0.08, 0.3);
      const rum = ctx.createBufferSource();
      rum.buffer = this.noiseBrown;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.Q.value = 0.7;
      lp.frequency.setValueAtTime(520, t + d);
      lp.frequency.exponentialRampToValueAtTime(70, t + d + 2.6);
      const rg = ctx.createGain();
      rg.gain.setValueAtTime(0.0001, t + d);
      rg.gain.linearRampToValueAtTime(0.95 * p, t + d + 0.15);
      rg.gain.exponentialRampToValueAtTime(0.001, t + d + 3.0);
      rum.connect(lp);
      lp.connect(rg);
      rg.connect(this.master);
      rum.start(t + d);
      rum.stop(t + d + 3.1);

      // Sub grave
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(52, t + d);
      osc.frequency.exponentialRampToValueAtTime(28, t + d + 2.2);
      const og = ctx.createGain();
      og.gain.setValueAtTime(0.0001, t + d);
      og.gain.linearRampToValueAtTime(0.3 * p, t + d + 0.2);
      og.gain.exponentialRampToValueAtTime(0.001, t + d + 2.4);
      osc.connect(og);
      og.connect(this.master);
      osc.start(t + d);
      osc.stop(t + d + 2.5);
    }
  };

  /* ------------------------------------------------------------------ *
   *  Effets synchronisés (éclair + onde de choc + flash + tonnerre)
   * ------------------------------------------------------------------ */
  function restartClass(el, cls) {
    el.classList.remove(cls);
    void el.offsetWidth; // force le reflow pour relancer l'animation
    el.classList.add(cls);
  }

  function fxShock(target) {
    const r = photoEl.getBoundingClientRect();
    let x = 50;
    let y = 45;
    if (target && target.x >= r.left && target.x <= r.right && target.y >= r.top && target.y <= r.bottom) {
      x = ((target.x - r.left) / r.width) * 100;
      y = ((target.y - r.top) / r.height) * 100;
    }
    shockEl.style.left = `${x}%`;
    shockEl.style.top = `${y}%`;
    restartClass(shockEl, 'go');
    restartClass(flashEl, 'go');
    restartClass(card, 'strike');
  }

  let lastFire = 0;
  function fire(opts) {
    const o = opts || {};
    const now = performance.now();
    if (!o.force && now - lastFire < 160) return;
    lastFire = now;
    strike(o);
    fxShock(o.target);
    smoke.boost = Math.max(smoke.boost, o.target ? 0.5 : 0.7);
    smoke.flash = 1;
    Sound.thunder(o.power || 1);
  }

  /* ------------------------------------------------------------------ *
   *  Parallax tilt 3D
   * ------------------------------------------------------------------ */
  const tilt = { tx: 0, ty: 0, x: 0, y: 0 };

  window.addEventListener('pointermove', e => {
    if (e.pointerType === 'touch') return;
    tilt.tx = (e.clientX / W) * 2 - 1;
    tilt.ty = (e.clientY / H) * 2 - 1;
  }, { passive: true });
  document.documentElement.addEventListener('mouseleave', () => { tilt.tx = 0; tilt.ty = 0; });
  window.addEventListener('blur', () => { tilt.tx = 0; tilt.ty = 0; });

  function stepTilt(dt) {
    const k = Math.min(1, dt * 6);
    const dx = tilt.tx - tilt.x;
    const dy = tilt.ty - tilt.y;
    if (Math.abs(dx) < 0.0004 && Math.abs(dy) < 0.0004) return;
    tilt.x += dx * k;
    tilt.y += dy * k;
    const amount = reduceMotion ? 0.3 : 1;
    card.style.transform =
      `rotateX(${(-tilt.y * 5 * amount).toFixed(2)}deg) rotateY(${(tilt.x * 7 * amount).toFixed(2)}deg)`;
    card.style.setProperty('--gx', `${(50 + tilt.x * 40).toFixed(1)}%`);
    card.style.setProperty('--gy', `${(40 + tilt.y * 40).toFixed(1)}%`);
  }

  /* ------------------------------------------------------------------ *
   *  Galerie : navigation et transitions
   * ------------------------------------------------------------------ */
  let current = 0;
  let activeLayer = 0;
  let activeAmb = 0;
  let busy = false;
  let infoTimer = 0;

  const dotButtons = PHOTOS.map((p, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'dot';
    b.setAttribute('aria-label', `Photo ${i + 1} : ${p.title}`);
    b.addEventListener('click', () => { if (i !== current) show(i, i > current ? 1 : -1); });
    dotsEl.appendChild(b);
    return b;
  });
  totEl.textContent = pad(N);

  // Préchargement en arrière-plan de toutes les photos
  const preloaded = PHOTOS.map(p => {
    const img = new Image();
    img.decoding = 'async';
    img.src = p.src;
    return img;
  });

  function updateInfo(n, first) {
    const apply = () => {
      titleEl.textContent = PHOTOS[n].title;
      captionEl.textContent = PHOTOS[n].caption;
      curEl.textContent = pad(n + 1);
    };
    clearTimeout(infoTimer);
    if (first) { apply(); return; }
    infoEl.classList.add('out');
    infoTimer = setTimeout(() => { apply(); infoEl.classList.remove('out'); }, 240);
  }

  async function show(n, dir, first) {
    if (busy && !first) return;
    busy = true;
    const photo = PHOTOS[n];
    const inc = layers[1 - activeLayer];
    const out = layers[activeLayer];

    inc.alt = `${photo.title} — ${photo.caption}`;
    inc.style.objectPosition = photo.pos;
    inc.src = photo.src;
    try { await inc.decode(); } catch (e) { /* image lente ou absente : on continue */ }

    // Entrée : zoom doux + léger glissement depuis le côté de navigation
    inc.style.transition = 'none';
    inc.style.transform = `translateX(${dir * 4}%) scale(1.12)`;
    void inc.offsetWidth;
    inc.style.transition = '';
    inc.style.transform = '';
    inc.classList.add('is-active');
    if (!first) {
      out.classList.remove('is-active');
      out.style.transform = `translateX(${-dir * 3}%) scale(0.96)`;
    }
    activeLayer = 1 - activeLayer;

    // Reflet ambiant flou
    const nextAmb = first ? activeAmb : 1 - activeAmb;
    ambs[nextAmb].style.backgroundImage = `url("${photo.src}")`;
    ambs[nextAmb].classList.add('is-active');
    if (!first) ambs[activeAmb].classList.remove('is-active');
    activeAmb = nextAmb;

    current = n;
    updateInfo(n, first);
    dotButtons.forEach((d, i) => {
      d.classList.toggle('is-active', i === n);
      d.setAttribute('aria-current', i === n ? 'true' : 'false');
    });
    progressEl.style.width = `${((n + 1) / N) * 100}%`;

    if (first) {
      setTheme(photo.theme, true);
    } else {
      setTheme(photo.theme, false);
      smoke.boost = 1;
      fire({ force: true });
    }

    setTimeout(() => { busy = false; }, first ? 0 : 450);
  }

  function go(dir) {
    show((current + dir + N) % N, dir);
  }

  /* ------------------------------------------------------------------ *
   *  Contrôles
   * ------------------------------------------------------------------ */
  $('#btn-prev').addEventListener('click', () => go(-1));
  $('#btn-next').addEventListener('click', () => go(1));
  $('#btn-bolt').addEventListener('click', () => fire({ force: true }));

  document.querySelectorAll('[data-smoke]').forEach(btn => {
    btn.addEventListener('click', () => {
      smoke.dense = btn.dataset.smoke === 'dense';
      document.querySelectorAll('[data-smoke]').forEach(b => {
        b.setAttribute('aria-pressed', String(b === btn));
      });
      smoke.boost = Math.max(smoke.boost, 0.4);
    });
  });

  const soundBtn = $('#btn-sound');
  soundBtn.addEventListener('click', () => {
    const on = Sound.toggle();
    soundBtn.setAttribute('aria-pressed', String(on));
  });

  // Mode tempête : éclairs aléatoires automatiques
  let storm = false;
  let stormTimer = 0;
  const stormBtn = $('#btn-storm');

  function stormLoop() {
    clearTimeout(stormTimer);
    if (!storm) return;
    stormTimer = setTimeout(() => {
      if (!document.hidden) fire({ force: true, power: rand(0.5, 1.1) });
      stormLoop();
    }, rand(2200, 5500));
  }

  stormBtn.addEventListener('click', () => {
    storm = !storm;
    stormBtn.setAttribute('aria-pressed', String(storm));
    if (storm) fire({ force: true });
    stormLoop();
  });

  // Clic / tap sur la photo : foudre ciblée
  photoEl.addEventListener('click', e => {
    fire({ force: true, target: { x: e.clientX, y: e.clientY }, power: 0.9 });
  });

  // Clavier
  window.addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
    else if (e.code === 'Space' || e.key === ' ') {
      e.preventDefault();
      if (!e.repeat) fire({ force: true });
    }
  });
  window.addEventListener('keyup', e => {
    if (e.code === 'Space' || e.key === ' ') e.preventDefault(); // évite le "clic" sur un bouton focalisé
  });

  // Tactile : swipe gauche / droite
  let touchStart = null;
  cardWrap.addEventListener('touchstart', e => {
    const t = e.changedTouches[0];
    touchStart = { x: t.clientX, y: t.clientY };
  }, { passive: true });
  cardWrap.addEventListener('touchend', e => {
    if (!touchStart) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.x;
    const dy = t.clientY - touchStart.y;
    touchStart = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) go(dx < 0 ? 1 : -1);
  }, { passive: true });

  /* ------------------------------------------------------------------ *
   *  Boucle principale (une seule requestAnimationFrame)
   * ------------------------------------------------------------------ */
  let last = performance.now();
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    stepColors(now);
    stepTilt(dt);
    drawSmoke(dt, now / 1000);
    drawLightning(performance.now());
    requestAnimationFrame(frame);
  }

  /* ------------------------------------------------------------------ *
   *  Démarrage
   * ------------------------------------------------------------------ */
  resize();
  applyColors();
  while (smoke.parts.length < targetCount()) smoke.parts.push(newParticle(true)); // fumée déjà installée au chargement

  const first = preloaded[0];
  const firstReady = new Promise(resolve => {
    if (first.complete && first.naturalWidth) resolve();
    else { first.addEventListener('load', resolve); first.addEventListener('error', resolve); }
  });

  firstReady.then(async () => {
    await show(0, 0, true);
    loaderEl.classList.add('hide');
    setTimeout(() => fire({ force: true, power: 0.6 }), 800); // éclair d'intro
  });

  requestAnimationFrame(frame);
})();
