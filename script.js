/* =========================================================
   紙がペラっとめくれる動き
   ---------------------------------------------------------
   しくみ：
   ・右下の角をつまんで、M の位置まで持っていくイメージ
   ・角と M のちょうど真ん中に「折り目」の線ができる
   ・折り目より角側の部分を、表の紙から切り取る（clip-path）
   ・切り取った部分を、折り目で裏返して上に重ねる（= 紙の裏側）
   これを1秒間に約60回計算して、なめらかに動かしています。
   ========================================================= */

// ▼ ここで動きを調整できます
const OPEN_TIME = 1300;    // めくれる時間（ミリ秒）
const CLOSE_TIME = 900;    // 戻る時間（ミリ秒）
const TEASE_EVERY = 3500;  // 角がチラッとめくれるヒントの間隔（ミリ秒）

const hero = document.getElementById('hero');
const sheet = document.getElementById('sheet');
const flap = document.getElementById('flap');
const shade = document.getElementById('shade');
const resetBtn = document.getElementById('resetBtn');

let W = 0, H = 0;           // 画面（カード）の大きさ
let current = null;         // 今の M の位置（null = めくれていない）
let state = 'closed';       // closed / moving / open
let animId = null;

function measure() {
  const r = hero.getBoundingClientRect();
  W = r.width;
  H = r.height;
}

// 右下の角
function corner() { return { x: W, y: H }; }

// 完全にめくり終わった時の M の位置（画面の左上の外側）
function endPoint() { return { x: -1.15 * W, y: -1.05 * H }; }

/* ---------- 計算用の小さな関数 ---------- */

// 四角形を直線で切って、片側だけ残す
function cutPolygon(points, P, n, side) {
  const out = [];
  for (let i = 0; i < points.length; i++) {
    const A = points[i];
    const B = points[(i + 1) % points.length];
    const da = ((A.x - P.x) * n.x + (A.y - P.y) * n.y) * side;
    const db = ((B.x - P.x) * n.x + (B.y - P.y) * n.y) * side;
    if (da >= 0) out.push(A);
    if ((da >= 0) !== (db >= 0)) {
      const t = da / (da - db);
      out.push({ x: A.x + (B.x - A.x) * t, y: A.y + (B.y - A.y) * t });
    }
  }
  return out;
}

function toClipPath(points) {
  if (points.length < 3) return 'polygon(0 0, 0 0, 0 0)';
  return 'polygon(' + points.map(p => `${p.x}px ${p.y}px`).join(',') + ')';
}

/* ---------- M の位置に合わせて紙を描く ---------- */
function render(M) {
  current = M;
  const C = corner();
  const dx = C.x - M.x;
  const dy = C.y - M.y;
  const len = Math.hypot(dx, dy);

  // ほとんど動いていない時は、元の状態に戻す
  if (len < 1) {
    sheet.style.clipPath = '';
    flap.style.visibility = 'hidden';
    current = null;
    return;
  }

  const n = { x: dx / len, y: dy / len };              // 折り目に垂直な向き
  const P = { x: (C.x + M.x) / 2, y: (C.y + M.y) / 2 }; // 折り目が通る点
  const rect = [{ x: 0, y: 0 }, { x: W, y: 0 }, { x: W, y: H }, { x: 0, y: H }];

  // 表の紙：折り目より奥側だけ残す
  sheet.style.clipPath = toClipPath(cutPolygon(rect, P, n, -1));

  // 裏側：角側の部分を切り出して、折り目で裏返す
  flap.style.clipPath = toClipPath(cutPolygon(rect, P, n, 1));
  const pn = P.x * n.x + P.y * n.y;
  flap.style.transform = `matrix(${1 - 2 * n.x * n.x}, ${-2 * n.x * n.y}, ${-2 * n.x * n.y}, ${1 - 2 * n.y * n.y}, ${2 * pn * n.x}, ${2 * pn * n.y})`;
  flap.style.visibility = 'visible';

  // 折り目のあたりを少し暗くして、紙の丸みを出す
  const deg = Math.atan2(n.x, -n.y) * 180 / Math.PI;
  const L = Math.abs(W * n.x) + Math.abs(H * n.y);
  const s = (P.x - W / 2) * n.x + (P.y - H / 2) * n.y + L / 2;
  const w = len / 2;
  shade.style.background = `linear-gradient(${deg}deg,
    rgba(80,80,110,.22) ${s}px,
    rgba(255,255,255,.45) ${s + w * 0.25}px,
    rgba(255,255,255,0) ${s + w * 0.6}px,
    rgba(80,80,110,.08) ${s + w}px)`;
}

/* ---------- アニメーション ---------- */
const easeInOut = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const easeOut = t => 1 - Math.pow(1 - t, 3);
const easeSoft = t => (1 - Math.cos(Math.PI * t)) / 2;

function animate(from, to, time, ease, done) {
  cancelAnimationFrame(animId);
  const start = performance.now();
  function frame(now) {
    const t = Math.min((now - start) / time, 1);
    const e = ease(t);
    // ちょっとだけ弧を描くように動かすと、より紙らしくなる
    const lift = Math.sin(Math.PI * t) * 0.08 * H;
    render({
      x: from.x + (to.x - from.x) * e,
      y: from.y + (to.y - from.y) * e - lift,
    });
    if (t < 1) animId = requestAnimationFrame(frame);
    else if (done) done();
  }
  animId = requestAnimationFrame(frame);
}

function open() {
  state = 'moving';
  hero.classList.add('is-moving');
  animate(current || corner(), endPoint(), OPEN_TIME, easeSoft, () => {
    render(corner());                  // 表の紙ごと非表示にする
    sheet.style.visibility = 'hidden';
    state = 'open';
    hero.classList.remove('is-moving');
    hero.classList.add('is-open');
    document.body.classList.remove('is-locked');
  });
}

function close() {
  state = 'moving';
  hero.classList.remove('is-open');
  document.body.classList.add('is-locked');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  sheet.style.visibility = '';
  animate(endPoint(), corner(), CLOSE_TIME, easeSoft, () => {
    render(corner());
    state = 'closed';
  });
}

function snapBack() {
  animate(current || corner(), corner(), 450, easeOut, () => {
    render(corner());
    state = 'closed';
    hero.classList.remove('is-moving');
  });
}

/* ---------- 指やマウスの操作 ---------- */
let down = null;     // 押し始めた位置
let dragging = false;

sheet.addEventListener('pointerdown', e => {
  if (state !== 'closed') return;
  cancelAnimationFrame(animId);
  render(corner());
  measure();
  down = { x: e.clientX, y: e.clientY };
  dragging = false;
  sheet.setPointerCapture(e.pointerId);
});

sheet.addEventListener('pointermove', e => {
  if (!down) return;
  const mx = e.clientX - down.x;
  const my = e.clientY - down.y;
  if (!dragging && Math.hypot(mx, my) < 8) return;
  dragging = true;
  hero.classList.add('is-moving');
  // 指を動かした方向に、角が付いてくる（左上方向のみ）
  const C = corner();
  render({ x: C.x + Math.min(0, mx * 1.6), y: C.y + Math.min(0, my * 1.6) });
});

function release() {
  if (!down) return;
  down = null;
  if (!dragging) { open(); return; }          // タップ → ペラっとめくる
  const C = corner();
  const pulled = current ? Math.hypot(C.x - current.x, C.y - current.y) : 0;
  if (pulled > Math.min(W, H) * 0.35) open(); // しっかり引っぱったら最後までめくる
  else snapBack();                            // 少しだけなら元に戻る
}
sheet.addEventListener('pointerup', release);
sheet.addEventListener('pointercancel', release);

// キーボード（Enter / スペース）でもめくれるように
sheet.addEventListener('keydown', e => {
  if ((e.key === 'Enter' || e.key === ' ') && state === 'closed') {
    e.preventDefault();
    open();
  }
});

resetBtn.addEventListener('click', () => {
  if (state === 'open') close();
});

/* ---------- 角がチラッとめくれるヒント ---------- */
setInterval(() => {
  if (state !== 'closed' || down) return;
  const C = corner();
  const peek = { x: C.x - W * 0.16, y: C.y - H * 0.09 };
  animate(C, peek, 500, easeOut, () => {
    if (state !== 'closed' || down) return;
    animate(peek, C, 600, easeInOut, () => render(C));
  });
}, TEASE_EVERY);

window.addEventListener('resize', () => {
  measure();
  if (state === 'closed') render(corner());
});

measure();
