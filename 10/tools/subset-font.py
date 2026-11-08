# Re-subset the four fonts to the glyphs this page uses.
# usage: python3 tools/subset-font.py <PretendardVariable.woff2> <Hahmlet[wght].ttf> <NanumPenScript-Regular.ttf> <FrauncesItalicSoft.ttf>
# (Pretendard: npm package pretendard@1.3.9, dist/web/variable/woff2/PretendardVariable.woff2;
#  Hahmlet, Nanum Pen Script and Fraunces: github.com/google/fonts, ofl/hahmlet, ofl/nanumpenscript, ofl/fraunces.
#  FrauncesItalicSoft.ttf is Fraunces-Italic[SOFT,WONK,opsz,wght] pinned with fontTools.varLib.instancer
#  to SOFT=100, WONK=1, opsz=72, keeping wght 500–900.)
import glob, os, sys
from fontTools import subset
from fontTools.ttLib import TTFont

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
text = ''.join(open(p, encoding='utf8').read() for p in glob.glob(os.path.join(root, 'js', '*.js')) + [os.path.join(root, 'index.html')])
chars = set(text) | {chr(c) for c in range(0x20, 0x7f)} | set('‘’“”…·→←↑↓✓▶■♪♫♡♩%~−×|')
for src, name in zip(sys.argv[1:5], ['pretendard-sub', 'hahmlet-sub', 'nanumpen-sub', 'fraunces-italic-sub']):
    cmap = TTFont(src).getBestCmap()
    keep = ''.join(sorted(c for c in chars if ord(c) in cmap))
    opts = subset.Options()
    opts.flavor = 'woff2'
    opts.layout_features = ['*']
    opts.name_IDs = ['*']
    opts.notdef_outline = True
    f = TTFont(src)
    s = subset.Subsetter(opts)
    s.populate(text=keep)
    s.subset(f)
    out = os.path.join(root, 'fonts', name + '.woff2')
    f.flavor = 'woff2'
    f.save(out)
    print(f'{len(keep)} glyphs -> {out} ({os.path.getsize(out) // 1024} KB)')
