// 花のレイヤーをタップしたら「is-open」というクラスを付けるだけ。
// 実際の動きは style.css の @keyframes peel で作っています。

const hero = document.getElementById('hero');
const sheet = document.getElementById('flowerSheet');
const resetBtn = document.getElementById('resetBtn');

// めくる前はスクロールを止めておく
document.body.classList.add('is-locked');

// 花をめくる
sheet.addEventListener('click', () => {
  hero.classList.remove('is-closing');
  hero.classList.add('is-open');
  document.body.classList.remove('is-locked');
});

// 花を戻す
resetBtn.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
  hero.classList.remove('is-open');
  hero.classList.add('is-closing');
  document.body.classList.add('is-locked');
});
