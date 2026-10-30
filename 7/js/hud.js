/* ============================================================
   HUD — flat 2D layer on top of the 3D frame: channel bug,
   music-video credit, end-card details
   ============================================================ */
import { W, H, clamp, pr, Ease, beatPulse, beatOf } from './util.js';

export const SANS = '"PretendardV","Pretendard","Apple SD Gothic Neo","Noto Sans KR",sans-serif';
export const DISCO = '"Monoton",' + SANS;
const KADA = [['K', '#3478B8'], ['A', '#E0558C'], ['D', '#F2B83C'], ['A', '#34AE90']];

function kadaMark(g, x, y, size, a = 1) {
  g.save(); g.globalAlpha *= a;
  g.font = `800 ${size}px ${SANS}`; g.textBaseline = 'alphabetic';
  let cx = x;
  KADA.forEach(([c, col], i) => {
    g.fillStyle = col;
    g.globalCompositeOperation = 'source-over';
    g.fillText(c, cx, y + (i % 2 ? size * 0.18 : 0));
    cx += g.measureText(c).width * (c === 'A' ? 0.82 : 0.9);
  });
  g.restore();
  return cx - x;
}

function pill(g, x, y, w, h, fill) { g.beginPath(); g.roundRect(x, y, w, h, h / 2); g.fillStyle = fill; g.fill(); }

export function drawHUD(g, t, sec) {
  const end = sec.layout === 'end';
  // channel bug, top right (music-TV style)
  if (!end) {
    const a = clamp(pr(t, 0.4, 1.2));
    g.save(); g.globalAlpha = 0.92 * a;
    const x = W - 64, y = 66;
    g.font = `700 22px ${SANS}`; g.textAlign = 'right'; g.textBaseline = 'middle';
    const label = '2026.11.22 SUN · 서울성모병원';
    const tw = g.measureText(label).width;
    pill(g, x - tw - 128, y - 24, tw + 150, 48, 'rgba(10,4,20,0.55)');
    g.fillStyle = '#FFF4FA'; g.fillText(label, x - 4, y + 1);
    const live = 0.55 + 0.45 * beatPulse(t, 4);
    g.beginPath(); g.arc(x - tw - 104, y, 7, 0, Math.PI * 2); g.fillStyle = `rgba(255,61,154,${live})`; g.fill();
    g.textAlign = 'left';
    kadaMark(g, x - tw - 88, y + 9, 26);
    g.restore();
  }
  // credit in the corner, like the start of a music video
  const ca = Math.min(Ease.outCubic(pr(t, 1.0, 1.6)), 1 - Ease.inCubic(pr(t, 7.4, 8.2)));
  if (ca > 0) {
    g.save(); g.globalAlpha = ca;
    const x = 72 - (1 - ca) * 40, y = H - 210;
    g.fillStyle = 'rgba(255,255,255,0.92)'; g.fillRect(x, y, 4, 136);
    g.textBaseline = 'alphabetic'; g.textAlign = 'left';
    g.fillStyle = '#FFFFFF'; g.font = `800 40px ${SANS}`; g.fillText('잘되는 치과는 무엇이 다를까', x + 26, y + 44);
    g.fillStyle = 'rgba(255,244,250,0.85)'; g.font = `600 26px ${SANS}`; g.fillText('대한치과의료관리학회 2026년 11월 종합학술대회', x + 26, y + 86);
    g.fillStyle = 'rgba(255,244,250,0.6)'; g.font = `500 22px ${SANS}`; g.fillText('Music: iontiger (Suno) · 3D: three.js', x + 26, y + 124);
    g.restore();
  }
  if (end) drawEnd(g, t, sec);
}

function drawEnd(g, t, sec) {
  const a = (d) => Ease.outCubic(pr(t, sec.from + d, sec.from + d + 0.6));
  g.save();
  g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  // title
  let k = a(0.3);
  g.globalAlpha = k;
  g.fillStyle = '#FFFFFF'; g.font = `800 34px ${SANS}`;
  g.fillText('대한치과의료관리학회 2026년 11월 종합학술대회', W / 2, 120 - (1 - k) * 20);
  k = a(0.5); g.globalAlpha = k;
  g.font = `900 64px ${SANS}`;
  const grad = g.createLinearGradient(W / 2 - 420, 0, W / 2 + 420, 0);
  grad.addColorStop(0, '#5BFFC6'); grad.addColorStop(0.5, '#3BE8FF'); grad.addColorStop(1, '#C6A2FF');
  g.fillStyle = grad;
  g.fillText('AI 이전부터 AI 이후까지 · 서로 다른 성공 방식', W / 2, 200 - (1 - k) * 20);
  // details panel
  k = a(1.2); g.globalAlpha = k;
  const pw = 1180, ph = 196, px = W / 2 - pw / 2, py = H - 268 + (1 - k) * 30;
  g.beginPath(); g.roundRect(px, py, pw, ph, 28); g.fillStyle = 'rgba(12,5,24,0.72)'; g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.18)'; g.lineWidth = 2; g.stroke();
  const rows = [
    ['일시', '2026년 11월 22일 (일) 09:30 – 17:30'],
    ['장소', '서울성모병원 대강당 (지하 1층)'],
    ['보수교육', '치과의사 4점 (필수 2점 포함) · 치과위생사 2점'],
  ];
  g.textAlign = 'left';
  rows.forEach(([h, v], i) => {
    const y = py + 58 + i * 52;
    pill(g, px + 48, y - 30, 120, 40, i === 2 ? '#E0558C' : '#3478B8');
    g.fillStyle = '#fff'; g.font = `800 22px ${SANS}`; g.textAlign = 'center'; g.fillText(h, px + 108, y - 2);
    g.textAlign = 'left'; g.font = `700 30px ${SANS}`; g.fillStyle = '#FFF4FA'; g.fillText(v, px + 192, y);
  });
  g.textAlign = 'right'; g.font = `800 26px ${SANS}`; g.fillStyle = '#FFE14D';
  g.fillText('사전등록 www.kadap.org', px + pw - 48, py + ph - 30);
  g.restore();
}
