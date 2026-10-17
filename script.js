(() => {
'use strict';
const cv = document.getElementById('game'), ctx = cv.getContext('2d');
const H = 540, T = 40, GY = 420, SPEED = 400, G = 3600, JV = 800, S = T;
let W = 960, PX = 200, K = 1, KY = 1;
const $ = id => document.getElementById(id);
const stage = $('stage'), menuEl = $('menu'), winEl = $('win'), pauseEl = $('pause');
const CY = '#19f0ff', PK = '#ff2e88', YL = '#ffe14a';

/* ---------- Nível (coordenadas em blocos; y = altura acima do chão) ---------- */
const lv = [];
const spike = (x, y = 0) => lv.push({ t: 's', x, y });
const block = (x, y, w = 1, h = 1) => lv.push({ t: 'b', x, y, w, h });
const pad = (x, y = 0) => lv.push({ t: 'p', x, y });
const orb = (x, y) => lv.push({ t: 'o', x, y });
const row = (a, b) => { for (let i = a; i <= b; i++) spike(i); };

spike(16); spike(24); spike(25); row(33, 35);
pad(41); row(43, 46);
block(54, 0, 2, 1); spike(60);
block(66, 0, 2, 1); block(68, 0, 2, 2); block(70, 0, 2, 3); spike(76); spike(77);
row(84, 89); orb(86, 2);
row(100, 110); block(101, 1, 10, 1); spike(107, 2);
pad(118); row(120, 123);
row(130, 132); block(138, 0, 1, 1); spike(141); spike(142);
const END = 152 * T;

lv.forEach(o => {
  if (o.t === 'b') { o.x1 = o.x * T; o.x2 = (o.x + o.w) * T; o.y1 = GY - (o.y + o.h) * T; o.y2 = GY - o.y * T; }
  if (o.t === 's') { o.x1 = o.x * T + 14; o.x2 = o.x * T + 26; o.y1 = GY - (o.y + 1) * T + 14; o.y2 = GY - o.y * T; }
  if (o.t === 'p') { o.x1 = o.x * T + 4; o.x2 = o.x * T + 36; o.y1 = GY - o.y * T - 10; o.y2 = GY - o.y * T; }
  if (o.t === 'o') { o.cx = o.x * T + 20; o.cy = GY - o.y * T - 20; }
  /* extensão horizontal completa (blocos largos não podem sumir pela borda esquerda) */
  if (o.t === 'o') { o.xa = o.cx - 30; o.xb = o.cx + 30; } else { o.xa = o.x1; o.xb = o.x2; }
});

/* ---------- Estado ---------- */
const P = { x: 0, y: GY - S, vy: 0, rot: 0, ground: true };
let state = 'menu', down = false, tries = 1, deadT = 0, idle = 0, trailT = 0, time = 0, shake = 0;
let best = 0; try { best = +localStorage.getItem('gd_best') || 0; } catch (e) {}
const parts = [];
$('bestMenu').textContent = best;

function setState(n) {
  state = n; stage.dataset.state = n; down = false;
  menuEl.classList.toggle('hidden', n !== 'menu');
  pauseEl.classList.toggle('hidden', n !== 'pause');
  winEl.classList.toggle('hidden', n !== 'win');
}
function reset() {
  Object.assign(P, { x: 0, y: GY - S, vy: 0, rot: 0, ground: true });
  lv.forEach(o => o.used = false);
  parts.length = 0; setState('play');
}
function start() { tries = 1; reset(); }
function die() {
  state = 'dead'; stage.dataset.state = 'dead'; deadT = 0.8; shake = 0.25;
  const pr = Math.floor(Math.min(1, P.x / END) * 100);
  if (pr > best) { best = pr; try { localStorage.setItem('gd_best', best); } catch (e) {} $('bestMenu').textContent = best; }
  for (let i = 0; i < 40; i++) {
    const a = Math.random() * 6.283, v = 150 + Math.random() * 380;
    parts.push({ x: P.x + S / 2, y: P.y + S / 2, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.7, max: 0.7, s: 4 + Math.random() * 7, c: i % 2 ? CY : PK, g: 1 });
  }
}
function win() {
  best = 100; try { localStorage.setItem('gd_best', 100); } catch (e) {} $('bestMenu').textContent = best;
  $('winTries').textContent = tries; setState('win');
}
function pause() { if (state === 'play') setState('pause'); }
function resume() { if (state === 'pause') setState('play'); }

/* ---------- Entrada ---------- */
const press = () => { if (state === 'play') down = true; };
addEventListener('pointerdown', e => { if (e.target.tagName !== 'BUTTON') press(); });
addEventListener('pointerup', () => down = false);
addEventListener('pointercancel', () => down = false);
addEventListener('blur', () => down = false);
addEventListener('keydown', e => {
  if (e.code === 'KeyP' || e.code === 'Escape') { state === 'pause' ? resume() : pause(); return; }
  if (['Space', 'ArrowUp', 'KeyW'].includes(e.code)) { e.preventDefault(); if (state === 'menu') start(); else if (state === 'pause') resume(); else press(); }
});
addEventListener('keyup', e => { if (['Space', 'ArrowUp', 'KeyW'].includes(e.code)) down = false; });
$('play').onclick = start; $('again').onclick = start;
$('pauseBtn').onclick = pause; $('resume').onclick = resume;
$('quit').onclick = () => { reset(); setState('menu'); };
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
const fsEl = document.documentElement;
if (!(fsEl.requestFullscreen || fsEl.webkitRequestFullscreen)) $('fsBtn').style.display = 'none';
$('fsBtn').onclick = () => {
  const on = document.fullscreenElement || document.webkitFullscreenElement;
  if (on) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
  else (fsEl.requestFullscreen || fsEl.webkitRequestFullscreen).call(fsEl);
};

/* ---------- Responsividade ---------- */
function resize() {
  const vw = innerWidth, vh = innerHeight, a = Math.max(1.33, Math.min(2.4, vw / vh));
  const sw = Math.floor(Math.min(vw, vh * a)), sh = Math.floor(sw / a);
  stage.style.width = sw + 'px'; stage.style.height = sh + 'px'; stage.style.setProperty('--u', sh / 100 + 'px');
  W = Math.round(H * a);
  const dpr = Math.min(2, devicePixelRatio || 1);
  cv.width = Math.round(sw * dpr); cv.height = Math.round(sh * dpr);
  K = cv.width / W; KY = cv.height / H;
  PX = Math.max(150, Math.min(260, W * 0.2));
}
addEventListener('resize', resize);
addEventListener('orientationchange', () => setTimeout(resize, 250));
resize();

/* ---------- Física ---------- */
const hit = (a, b) => a.x1 < b.x2 && a.x2 > b.x1 && a.y1 < b.y2 && a.y2 > b.y1;

function step(dt) {
  P.x += SPEED * dt;
  if (down && P.ground) { P.vy = -JV; P.ground = false; }
  const prevBottom = P.y + S;
  P.vy += G * dt; P.y += P.vy * dt; P.ground = false;
  if (P.y + S >= GY) { P.y = GY - S; P.vy = 0; P.ground = true; }

  for (const o of lv) {
    if (o.xb < P.x - 80 || o.xa > P.x + S + 80) continue;
    const pl = { x1: P.x + 3, x2: P.x + S - 3, y1: P.y + 5, y2: P.y + S };
    if (o.t === 'b' && hit(pl, o)) {
      if (prevBottom <= o.y1 + 10 && P.vy >= 0) { P.y = o.y1 - S; P.vy = 0; P.ground = true; }
      else return die();
    } else if (o.t === 's' && hit(pl, o)) return die();
    else if (o.t === 'p' && !o.used && hit(pl, o)) { o.used = true; P.vy = -1000; P.ground = false; burst(o.x1 + 16, o.y2, YL); }
    else if (o.t === 'o' && !o.used && down && Math.hypot(P.x + S / 2 - o.cx, P.y + S / 2 - o.cy) < 36) {
      o.used = true; P.vy = -720; P.ground = false; burst(o.cx, o.cy, YL);
    }
  }
  if (P.ground) { const t = Math.round(P.rot / (Math.PI / 2)) * Math.PI / 2; P.rot += (t - P.rot) * Math.min(1, dt * 25); }
  else P.rot += 7 * dt;

  trailT -= dt;
  if (trailT <= 0) {
    trailT = 0.025;
    parts.push({ x: P.x, y: P.y + S - 4 - Math.random() * 10, vx: -120 - Math.random() * 120, vy: -Math.random() * 40, life: 0.4, max: 0.4, s: 3 + Math.random() * 4, c: CY, g: 0 });
  }
  if (P.x >= END) win();
}
function burst(x, y, c) {
  for (let i = 0; i < 16; i++) parts.push({ x, y, vx: (Math.random() - .5) * 160, vy: -Math.random() * 300, life: .5, max: .5, s: 3 + Math.random() * 4, c, g: 1 });
}
function updParts(dt) {
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i]; p.life -= dt;
    if (p.life <= 0) { parts.splice(i, 1); continue; }
    p.x += p.vx * dt; p.y += p.vy * dt; if (p.g) p.vy += 1200 * dt;
  }
}

/* ---------- Desenho ---------- */
function hash(n) { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); }
function neon(c, w) {
  ctx.lineJoin = 'round'; ctx.strokeStyle = c;
  ctx.globalAlpha = 0.22; ctx.lineWidth = w + 6; ctx.stroke();
  ctx.globalAlpha = 1; ctx.lineWidth = w; ctx.stroke();
}

function drawBG(scroll, hue) {
  const g = ctx.createLinearGradient(0, 0, 0, GY);
  g.addColorStop(0, `hsl(${hue},75%,6%)`); g.addColorStop(1, `hsl(${hue + 25},80%,16%)`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const rg = ctx.createRadialGradient(W / 2, GY, 10, W / 2, GY, W * 0.6);
  rg.addColorStop(0, `hsla(${hue + 40},100%,50%,.28)`); rg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = rg; ctx.fillRect(0, 0, W, GY);
  for (let i = 0; i < 60; i++) {
    const x = (((hash(i) * W * 1.3 - scroll * (0.03 + hash(i + 1) * 0.08)) % W) + W) % W;
    ctx.globalAlpha = 0.2 + 0.6 * Math.abs(Math.sin(time * 2 + i)); ctx.fillStyle = '#bff';
    ctx.fillRect(x, hash(i + 2) * GY, 2, 2);
  }
  ctx.globalAlpha = 1;
  const off = scroll * 0.3, base = Math.floor(off / 180), n = Math.ceil(W / 180) + 3;
  for (let i = base - 1; i < base + n; i++) {
    const x = i * 180 - off, r = hash(i), w = 100 + hash(i + 9) * 150, h = 90 + hash(i + 3) * 240, y = hash(i + 5) * 110;
    ctx.fillStyle = `hsla(${hue},80%,35%,.14)`; ctx.fillRect(x + 10, y, w, h);
    ctx.strokeStyle = `hsla(${hue + 40},100%,65%,.3)`; ctx.lineWidth = 1; ctx.strokeRect(x + 10.5, y + .5, w, h);
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, GY); ctx.moveTo(x + 10 + w, y + h * .4); ctx.lineTo(x + 50 + w, y + h * .4); ctx.lineTo(x + 50 + w, y + h * .4 + 30); ctx.stroke();
    ctx.fillStyle = `hsla(${hue + 40},100%,75%,.9)`; ctx.fillRect(x - 3, ((time * 110 + r * 400) % GY), 6, 14);
    ctx.fillRect(x + 7, y - 3, 6, 6);
  }
}
function drawGround(cam, hue) {
  const g = ctx.createLinearGradient(0, GY, 0, H);
  g.addColorStop(0, `hsl(${hue},70%,13%)`); g.addColorStop(1, '#02030a');
  ctx.fillStyle = g; ctx.fillRect(0, GY, W, H - GY);
  ctx.strokeStyle = `hsla(${hue + 60},100%,60%,.3)`; ctx.lineWidth = 1; ctx.beginPath();
  for (const k of [10, 24, 44, 72, 108]) { const y = GY + k * (H - GY) / 110; ctx.moveTo(0, y); ctx.lineTo(W, y); }
  const gap = 80, vx = W / 2;
  for (let x = -(cam % gap) - gap; x < W + gap; x += gap) { ctx.moveTo(x, GY); ctx.lineTo(vx + (x - vx) * 2.6, H); }
  ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, GY); ctx.lineTo(W, GY); neon(CY, 2.5);
}

function drawObjs(cam) {
  ctx.save(); ctx.translate(-cam, 0);
  for (const o of lv) {
    if (o.xb < cam - 200 || o.xa > cam + W + 200) continue;
    if (o.t === 'b') {
      for (let i = 0; i < o.w; i++) for (let j = 0; j < o.h; j++) {
        const x = o.x1 + i * T, y = o.y1 + j * T;
        ctx.fillStyle = 'rgba(5,14,32,.94)'; ctx.fillRect(x + 1, y + 1, T - 2, T - 2);
        ctx.beginPath(); ctx.rect(x + 2, y + 2, T - 4, T - 4); neon(CY, 1.6);
        ctx.strokeStyle = 'rgba(25,240,255,.35)'; ctx.lineWidth = 1; ctx.strokeRect(x + 10.5, y + 10.5, T - 21, T - 21);
        ctx.fillStyle = CY; ctx.fillRect(x + 4, y + 4, 4, 4);
      }
    } else if (o.t === 's') {
      const x = o.x * T, y = GY - o.y * T;
      ctx.beginPath(); ctx.moveTo(x + 3, y - 2); ctx.lineTo(x + T / 2, y - T + 2); ctx.lineTo(x + T - 3, y - 2); ctx.closePath();
      ctx.fillStyle = 'rgba(40,0,22,.92)'; ctx.fill(); neon(PK, 2);
      ctx.beginPath(); ctx.moveTo(x + 12, y - 8); ctx.lineTo(x + T / 2, y - T + 14); ctx.lineTo(x + T - 12, y - 8); ctx.closePath();
      ctx.strokeStyle = 'rgba(255,46,136,.45)'; ctx.lineWidth = 1; ctx.stroke();
    } else if (o.t === 'p') {
      ctx.beginPath(); ctx.ellipse(o.x * T + 20, o.y2, 18, 8, 0, Math.PI, 0); ctx.fillStyle = 'rgba(255,225,74,.25)'; ctx.fill(); neon(YL, 2);
    } else if (o.t === 'o') {
      const k = 1 + Math.sin(time * 6) * 0.08;
      ctx.beginPath(); ctx.arc(o.cx, o.cy, 26 * k, 0, 6.283); ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.save(); ctx.translate(o.cx, o.cy); ctx.rotate(time * 2); ctx.setLineDash([6, 6]);
      ctx.beginPath(); ctx.arc(0, 0, 19, 0, 6.283); neon(YL, 2); ctx.restore();
      ctx.fillStyle = YL; ctx.beginPath(); ctx.arc(o.cx, o.cy, 9, 0, 6.283); ctx.fill();
    }
  }
  const fg = ctx.createLinearGradient(END - 60, 0, END + 8, 0); fg.addColorStop(0, 'rgba(25,240,255,0)'); fg.addColorStop(1, 'rgba(25,240,255,.55)');
  ctx.fillStyle = fg; ctx.fillRect(END - 60, 0, 68, GY);
  ctx.fillStyle = '#fff'; ctx.fillRect(END, 0, 4, GY);

  ctx.globalCompositeOperation = 'lighter';
  for (const p of parts) { ctx.globalAlpha = Math.max(0, p.life / p.max); ctx.fillStyle = p.c; ctx.fillRect(p.x, p.y, p.s, p.s); }
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;

  if (state !== 'dead') {
    ctx.save(); ctx.translate(P.x + S / 2, P.y + S / 2); ctx.rotate(P.rot);
    ctx.fillStyle = '#04141c'; ctx.fillRect(-S / 2, -S / 2, S, S);
    ctx.beginPath(); ctx.rect(-S / 2 + 1.5, -S / 2 + 1.5, S - 3, S - 3); neon(CY, 2.5);
    ctx.fillStyle = PK; ctx.globalAlpha = .85; ctx.fillRect(-11, -11, 22, 22); ctx.globalAlpha = 1;
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.strokeRect(-11, -11, 22, 22);
    ctx.fillStyle = CY; ctx.fillRect(-4, -4, 8, 8);
    ctx.restore();
  }
  ctx.restore();
}
function drawHUD() {
  const pr = Math.min(1, P.x / END), n = 40, bw = Math.min(380, W * 0.4), sw = bw / n, bx = (W - bw) / 2;
  for (let i = 0; i < n; i++) { ctx.fillStyle = i < pr * n ? CY : 'rgba(255,255,255,.14)'; ctx.fillRect(bx + i * sw + 1, 16, sw - 2, 10); }
  ctx.font = '700 16px ui-monospace,Consolas,monospace'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff';
  ctx.textAlign = 'left'; ctx.fillText(Math.floor(pr * 100) + '%', bx + bw + 12, 22);
  ctx.textAlign = 'right'; ctx.fillStyle = CY; ctx.fillText('TENTATIVA ' + String(tries).padStart(2, '0'), W - 18, 22);
}

/* ---------- Loop ---------- */
let last = 0, acc = 0;
function frame(t) {
  const dt = Math.min(0.05, (t - last) / 1000 || 0); last = t; acc += dt; time += dt;
  const STEP = 1 / 120;
  if (state === 'play') while (acc >= STEP && state === 'play') { step(STEP); updParts(STEP); acc -= STEP; }
  else acc = 0;
  if (state === 'dead') { updParts(dt); deadT -= dt; if (deadT <= 0) { tries++; reset(); } }
  if (state === 'menu') idle += SPEED * 0.6 * dt;
  if (state === 'win') updParts(dt);
  shake = Math.max(0, shake - dt);

  const cam = P.x - PX, scroll = state === 'menu' ? idle : P.x, hue = state === 'menu' ? 275 : 275 - Math.min(1, P.x / END) * 70;
  ctx.setTransform(K, 0, 0, KY, 0, 0); ctx.save();
  if (shake > 0) ctx.translate((Math.random() - .5) * 10, (Math.random() - .5) * 10);
  drawBG(scroll, hue); drawGround(state === 'menu' ? idle : cam, hue); drawObjs(cam);
  ctx.restore();
  if (state !== 'menu') drawHUD();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
})();
