# motion/13 · 11월 빅 이벤트, 앤트로픽 상장

108 BPM funk synthesized with Web Audio; every on-screen entrance is registered with `hits()` in `js/scenes.js` and `js/music.js` plays an accent for it.

## Price data (`js/data.js`)

Daily closes from 2026-08-28, collected on 2026-11-12. Last available date differs per series:

| Series | Source | Through | Notes |
| --- | --- | --- | --- |
| NVDA | stockanalysis.com | 11/11 | after-hours 160 on the chart is the figure from the brief (stockanalysis showed 158.76 after hours on 11/11) |
| AMD | stockanalysis.com, Yahoo Finance | 11/11 | 11/10 from a news report; 11/11 = 11/10 close × reported +7.32% |
| AVGO | stockanalysis.com | 11/10 | 11/9 = 11/6 close × reported +8.78%; 11/10 from a news report |
| QQQ (Nasdaq-100 proxy) | stockanalysis.com | 11/6 | |
| SOX | Yahoo Finance | 10/30 | |
| Samsung Electronics | stockanalysis.com | 11/6 | no closes for 11/2–11/5 |
| SK hynix | stockanalysis.com | 11/6 | |
| Cambricon | stockanalysis.com, Yahoo Finance | 10/20 | |

The 200-day-line panels are diagrams (tagged 개념도), not data: no 200-day average series was available. IPO terms, the beneficiary reading and the valuation-gain estimate come from the brief.

## Tools

`tools/qa.mjs` (contact sheets, `--audio` loudness), `tools/render-mp4.mjs` (headless export), `tools/subset-font.py <font dir>` (re-run after changing on-screen text).
