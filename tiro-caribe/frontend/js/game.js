const $ = id => document.getElementById(id);
const cv = $("g"), x = cv.getContext("2d"), W = 480, H = 720;
cv.width = W; cv.height = H;

const NICK_RE = /^[A-Za-z0-9_ ]{3,16}$/;
let st = "menu", score = 0, lives = 3, lvl = 1, hi = 0, t = 0, spawnT = 0, shake = 0;
let mute = false, ac, ptr = null, keys = {}, nickname = "", finalScore = 0, finalLevel = 1;
let P, B, E, EB, U, F, S = [];

try { hi = +localStorage.getItem("tc_hi") || 0; nickname = localStorage.getItem("tc_nick") || ""; } catch (e) {}
$("nick").value = nickname;
for (let i = 0; i < 60; i++) S.push({ x: Math.random() * W, y: Math.random() * H, s: Math.random() * 2 + .5 });

const SP = {
  a: ["..#.....#..", "...#...#...", "..#######..", ".##.###.##.", "###########", "#.#######.#", "#.#.....#.#", "...##.##..."],
  b: ["....###....", "..#######..", ".#########.", "###..#..###", "###########", "..##...##..", ".##.###.##.", "##.......##"]
};
function spr(s, cx, cy, sc, col) {
  x.fillStyle = col;
  const w = s[0].length * sc, h = s.length * sc;
  for (let r = 0; r < s.length; r++)
    for (let c = 0; c < s[r].length; c++)
      if (s[r][c] == "#") x.fillRect(Math.round(cx - w / 2 + c * sc), Math.round(cy - h / 2 + r * sc), sc, sc);
}

function snd(f, d, ty, v) {
  if (mute) return;
  try {
    ac = ac || new AudioContext();
    const o = ac.createOscillator(), g = ac.createGain(), n = ac.currentTime;
    o.type = ty || "square";
    o.frequency.setValueAtTime(f, n);
    o.frequency.exponentialRampToValueAtTime(Math.max(30, f / 4), n + d);
    g.gain.setValueAtTime(v || .04, n);
    g.gain.exponentialRampToValueAtTime(.001, n + d);
    o.connect(g); g.connect(ac.destination);
    o.start(); o.stop(n + d);
  } catch (e) {}
}

/* ---------- Ranking (API) ---------- */
function listMessage(ol, text) {
  ol.textContent = "";
  const li = document.createElement("li");
  li.textContent = text;
  ol.appendChild(li);
}

function renderRank(ol, rows, me) {
  ol.textContent = "";
  if (!rows.length) { listMessage(ol, "Sé el primero en el ranking"); return; }
  rows.forEach(r => {
    const li = document.createElement("li");
    const a = document.createElement("span");
    const b = document.createElement("span");
    a.textContent = r.position + ". " + r.nickname;
    b.textContent = r.score;
    li.append(a, b);
    if (me && r.nickname === me.nickname && r.score === me.score) li.className = "me";
    ol.appendChild(li);
  });
}

async function loadMenuRank() {
  listMessage($("rank0"), "Cargando...");
  try { renderRank($("rank0"), await getTopScores(5)); }
  catch (e) { listMessage($("rank0"), "Ranking no disponible"); }
}

async function saveScore() {
  $("retry").style.display = "none";
  if (finalScore < 1) { $("msg").textContent = "Haz al menos 1 punto para entrar al ranking"; return; }
  $("msg").textContent = "Guardando puntaje...";
  try {
    const r = await sendScore(nickname, finalScore, finalLevel);
    $("msg").textContent = "Quedaste en el puesto #" + r.position + " del mundo";
  } catch (e) {
    $("msg").textContent = e.message;
    $("retry").style.display = "";
    return;
  }
  try {
    renderRank($("rank1"), await getTopScores(5), { nickname: nickname, score: finalScore });
  } catch (e) {
    listMessage($("rank1"), "Ranking no disponible");
  }
}

/* ---------- Juego ---------- */
function reset() {
  P = { x: W / 2, y: H - 90, cd: 0, pw: 1, pwt: 0, sh: 0, inv: 0 };
  B = []; E = []; EB = []; U = []; F = [];
  score = 0; lives = 3; lvl = 1; spawnT = 0; shake = 0;
}
function show(id) { ["menu", "over"].forEach(k => $(k).classList.toggle("on", k == id)); }

function start() { reset(); st = "play"; show(null); snd(600, .2); }

function tryPlay() {
  const n = $("nick").value.split(/\s+/).filter(Boolean).join(" ");
  if (!NICK_RE.test(n)) {
    $("nickErr").textContent = "Apodo de 3 a 16: letras, números, espacio o _";
    return;
  }
  $("nickErr").textContent = "";
  nickname = n;
  try { localStorage.setItem("tc_nick", n); } catch (e) {}
  start();
}

function fire() {
  const y = P.y - 18;
  if (P.pw == 1) B.push({ x: P.x, y: y, vx: 0 });
  else if (P.pw == 2) B.push({ x: P.x - 9, y: y, vx: 0 }, { x: P.x + 9, y: y, vx: 0 });
  else B.push({ x: P.x, y: y, vx: 0 }, { x: P.x - 10, y: y, vx: -2.2 }, { x: P.x + 10, y: y, vx: 2.2 });
  snd(900, .08, "square", .025);
}

function spawnE() {
  const r = Math.random(), m = Math.min(.45, .08 * lvl);
  let e;
  if (r < m * .7) e = { k: 2, hp: 5, w: 46, h: 36, vy: .7 + lvl * .05, sh: 1200 };
  else if (r < m + .25) e = { k: 1, hp: 2, w: 36, h: 30, vy: 1.2 + lvl * .08, sh: 0 };
  else e = { k: 0, hp: 1, w: 36, h: 30, vy: 1.5 + lvl * .12, sh: 0 };
  e.mhp = e.hp; e.x0 = 40 + Math.random() * (W - 80); e.x = e.x0; e.y = -30; e.t = Math.random() * 6; e.cd = e.sh;
  E.push(e);
}

function boom(px, py, col, n) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * 6.28, s = Math.random() * 4 + 1;
    F.push({ x: px, y: py, vx: Math.cos(a) * s, vy: Math.sin(a) * s, l: 600, c: col });
  }
}

function hurt() {
  if (P.inv > 0) return;
  if (P.sh > 0) { P.sh = 0; P.inv = 800; snd(200, .2, "sawtooth"); return; }
  lives--; P.inv = 1600; shake = 14; P.pw = 1;
  boom(P.x, P.y, "#2de2e6", 24);
  snd(120, .5, "sawtooth", .07);
  if (lives <= 0) over();
}

function over() {
  st = "over";
  finalScore = score; finalLevel = lvl;
  if (score > hi) { hi = score; try { localStorage.setItem("tc_hi", hi); } catch (e) {} }
  $("fs").textContent = score;
  listMessage($("rank1"), "...");
  show("over");
  saveScore();
}

function update(k, dt) {
  t += dt;
  const sp = 6 * k;
  if (keys.arrowleft || keys.a) P.x -= sp;
  if (keys.arrowright || keys.d) P.x += sp;
  if (keys.arrowup || keys.w) P.y -= sp;
  if (keys.arrowdown || keys.s) P.y += sp;
  if (ptr) { P.x += (ptr.x - P.x) * Math.min(1, .28 * k); P.y += (ptr.y - P.y) * Math.min(1, .28 * k); }
  P.x = Math.max(20, Math.min(W - 20, P.x));
  P.y = Math.max(120, Math.min(H - 30, P.y));
  P.cd -= dt; if (P.cd <= 0) { fire(); P.cd = P.pw >= 3 ? 140 : 180; }
  if (P.pwt > 0) { P.pwt -= dt; if (P.pwt <= 0) P.pw = 1; }
  if (P.inv > 0) P.inv -= dt;
  if (shake > 0) shake -= .6 * k;
  lvl = 1 + Math.floor(score / 1500);
  spawnT -= dt; if (spawnT <= 0) { spawnE(); spawnT = Math.max(260, 950 - lvl * 75); }
  B.forEach(b => { b.y -= 11 * k; b.x += b.vx * k; });
  B = B.filter(b => b.y > -20);
  E.forEach(e => {
    e.y += e.vy * k; e.t += .04 * k;
    if (e.k == 1) e.x = e.x0 + Math.sin(e.t * 2) * 70;
    if (e.sh) {
      e.cd -= dt;
      if (e.cd <= 0 && e.y > 0) {
        e.cd = e.sh;
        const a = Math.atan2(P.y - e.y, P.x - e.x);
        EB.push({ x: e.x, y: e.y, vx: Math.cos(a) * 3.2, vy: Math.sin(a) * 3.2 });
      }
    }
  });
  EB.forEach(b => { b.x += b.vx * k; b.y += b.vy * k; });
  EB = EB.filter(b => b.y < H + 10 && b.y > -10 && b.x > -10 && b.x < W + 10);
  for (const b of B) for (const e of E) {
    if (e.hp > 0 && !b.d && Math.abs(b.x - e.x) < e.w / 2 + 3 && Math.abs(b.y - e.y) < e.h / 2 + 6) {
      b.d = 1; e.hp--; e.fl = 80;
      if (e.hp <= 0) {
        score += e.k == 2 ? 150 : e.k == 1 ? 60 : 30;
        boom(e.x, e.y, e.k == 2 ? "#ff3d81" : e.k == 1 ? "#ffd23f" : "#2de2e6", e.k == 2 ? 30 : 16);
        snd(160, .25, "sawtooth", .05);
        if (Math.random() < (e.k == 2 ? .7 : .11)) U.push({ x: e.x, y: e.y, t: ["P", "S", "V"][Math.random() < .2 ? 2 : Math.random() < .5 ? 0 : 1] });
      } else snd(300, .05);
    }
  }
  B = B.filter(b => !b.d);
  E = E.filter(e => { if (e.fl) e.fl -= dt; return e.hp > 0 && e.y < H + 40; });
  for (const e of E) if (Math.abs(e.x - P.x) < e.w / 2 + 10 && Math.abs(e.y - P.y) < e.h / 2 + 10) { e.hp = 0; boom(e.x, e.y, "#fff", 12); hurt(); }
  EB = EB.filter(b => { if (Math.abs(b.x - P.x) < 12 && Math.abs(b.y - P.y) < 14) { hurt(); return false; } return true; });
  U.forEach(u => u.y += 2 * k);
  U = U.filter(u => {
    if (Math.abs(u.x - P.x) < 24 && Math.abs(u.y - P.y) < 24) {
      snd(1000, .2, "triangle", .06); score += 25;
      if (u.t == "P") { P.pw = Math.min(3, P.pw + 1); P.pwt = 9000; }
      else if (u.t == "S") P.sh = 1;
      else lives = Math.min(5, lives + 1);
      return false;
    }
    return u.y < H + 20;
  });
  F.forEach(f => { f.x += f.vx * k; f.y += f.vy * k; f.l -= dt; });
  F = F.filter(f => f.l > 0);
}

function draw() {
  x.save(); x.clearRect(0, 0, W, H);
  if (shake > 0) x.translate((Math.random() - .5) * shake, (Math.random() - .5) * shake);
  const g = x.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#120a2a"); g.addColorStop(.7, "#3a0f4d"); g.addColorStop(1, "#7a1f5c");
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  x.fillStyle = "#ffd23f"; x.beginPath(); x.arc(W / 2, H - 150, 70, Math.PI, 0); x.fill();
  x.fillStyle = "#3a0f4d"; for (let i = 0; i < 5; i++) x.fillRect(W / 2 - 70, H - 150 - i * 12 - 4, 140, 3 + i);
  S.forEach(s => { s.y += s.s * .6; if (s.y > H) s.y = 0; x.fillStyle = "rgba(255,255,255," + (s.s / 3) + ")"; x.fillRect(s.x, s.y, s.s, s.s); });
  x.fillStyle = "#1a0830"; x.fillRect(0, H - 150, W, 150);
  x.strokeStyle = "rgba(255,61,129,.45)"; x.lineWidth = 1;
  const off = (t * .03) % 30;
  for (let i = 0; i < 6; i++) { const y = H - 150 + Math.pow((i + off / 30) / 6, 2) * 150; x.beginPath(); x.moveTo(0, y); x.lineTo(W, y); x.stroke(); }
  for (let i = -8; i <= 8; i++) { x.beginPath(); x.moveTo(W / 2 + i * 8, H - 150); x.lineTo(W / 2 + i * 60, H); x.stroke(); }
  if (st != "menu") {
    U.forEach(u => {
      x.fillStyle = u.t == "P" ? "#ffd23f" : u.t == "S" ? "#2de2e6" : "#ff3d81";
      x.fillRect(u.x - 12, u.y - 12, 24, 24);
      x.fillStyle = "#000"; x.font = "12px 'Press Start 2P',monospace"; x.textAlign = "center";
      x.fillText(u.t == "V" ? "♥" : u.t, u.x, u.y + 5);
    });
    E.forEach(e => {
      const c = e.fl > 0 ? "#fff" : e.k == 2 ? "#ff3d81" : e.k == 1 ? "#ffd23f" : "#2de2e6";
      spr(e.k == 1 ? SP.b : SP.a, e.x, e.y, e.k == 2 ? 4 : 3, c);
      if (e.k == 2) {
        x.fillStyle = "#000"; x.fillRect(e.x - 20, e.y - 26, 40, 4);
        x.fillStyle = "#7CFF6B"; x.fillRect(e.x - 20, e.y - 26, 40 * e.hp / e.mhp, 4);
      }
    });
    x.fillStyle = "#fff"; B.forEach(b => x.fillRect(b.x - 2, b.y - 8, 4, 14));
    x.fillStyle = "#ff3d81"; EB.forEach(b => { x.beginPath(); x.arc(b.x, b.y, 5, 0, 6.28); x.fill(); });
    if (st != "over" && !(P.inv > 0 && Math.floor(t / 80) % 2)) {
      x.fillStyle = "#2de2e6"; x.beginPath();
      x.moveTo(P.x, P.y - 20); x.lineTo(P.x + 18, P.y + 16); x.lineTo(P.x + 7, P.y + 10);
      x.lineTo(P.x - 7, P.y + 10); x.lineTo(P.x - 18, P.y + 16); x.closePath(); x.fill();
      x.fillStyle = "#ff3d81"; x.fillRect(P.x - 3, P.y - 6, 6, 10);
      x.fillStyle = "#ffd23f"; x.fillRect(P.x - 4, P.y + 12, 8, 4 + Math.random() * 6);
      if (P.sh) { x.strokeStyle = "#2de2e6"; x.lineWidth = 3; x.beginPath(); x.arc(P.x, P.y, 28, 0, 6.28); x.stroke(); }
    }
    F.forEach(f => { x.fillStyle = f.c; x.globalAlpha = Math.max(0, f.l / 600); x.fillRect(f.x, f.y, 4, 4); });
    x.globalAlpha = 1;
    x.textAlign = "left"; x.font = "12px 'Press Start 2P',monospace";
    x.fillStyle = "#fff"; x.fillText("PTS " + score, 12, 26);
    x.fillStyle = "#ffd23f"; x.fillText("NIV " + lvl, 12, 48);
    x.textAlign = "right"; x.fillStyle = "#2de2e6"; x.fillText("REC " + Math.max(hi, score), W - 48, 26);
    x.fillStyle = "#ff3d81"; x.fillText("♥".repeat(Math.max(0, lives)), W - 48, 48);
    if (st == "pause") {
      x.fillStyle = "rgba(0,0,0,.6)"; x.fillRect(0, 0, W, H);
      x.fillStyle = "#ffd23f"; x.textAlign = "center"; x.font = "16px 'Press Start 2P',monospace"; x.fillText("PAUSA", W / 2, H / 2);
      x.font = "10px 'Press Start 2P',monospace"; x.fillStyle = "#fff"; x.fillText("toca para seguir", W / 2, H / 2 + 30);
    }
  }
  x.restore();
}

let last = 0;
function loop(ts) {
  const dt = Math.min(40, ts - (last || ts)); last = ts;
  if (st == "play") update(dt / 16.67, dt); else t += dt;
  draw(); requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

/* ---------- Controles ---------- */
function pos(e) {
  const r = cv.getBoundingClientRect();
  return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height };
}
cv.addEventListener("pointerdown", e => {
  if (st == "pause") { st = "play"; return; }
  const p = pos(e);
  ptr = { x: p.x, y: p.y - (e.pointerType == "touch" ? 70 : 0) };
});
cv.addEventListener("pointermove", e => {
  const p = pos(e);
  if (e.pointerType == "touch") { if (ptr) ptr = { x: p.x, y: p.y - 70 }; }
  else ptr = { x: p.x, y: p.y };
});
cv.addEventListener("pointerup", e => { if (e.pointerType == "touch") ptr = null; });
addEventListener("keydown", e => {
  if (e.target.tagName === "INPUT") { if (e.key === "Enter") tryPlay(); return; }
  keys[e.key.toLowerCase()] = 1;
  if (e.key.startsWith("Arrow") || e.key === " ") e.preventDefault();
  if (e.key === "Enter" && st === "over") start();
});
addEventListener("keyup", e => keys[e.key.toLowerCase()] = 0);
document.addEventListener("visibilitychange", () => { if (document.hidden && st == "play") st = "pause"; });
addEventListener("blur", () => { if (st == "play") st = "pause"; });

/* ---------- Botones ---------- */
$("play").onclick = tryPlay;
$("again").onclick = start;
$("retry").onclick = saveScore;
$("mute").onclick = () => { mute = !mute; $("mute").textContent = mute ? "✕" : "♪"; };

loadMenuRank();