# Re-subset the 2D fonts (HUD, page) to the glyphs this page uses.
# usage: python3 tools/subset-font.py <PretendardVariable.woff2> <Monoton-Regular.ttf>
# (Pretendard: npm package pretendard@1.3.9, dist/web/variable/woff2/PretendardVariable.woff2;
#  Monoton: github.com/google/fonts, ofl/monoton)
# The 3D letters come from tools/make-glyphs.py instead.
import glob, os, sys
from fontTools import subset
from fontTools.ttLib import TTFont

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
text = ''.join(open(p, encoding='utf8').read() for p in glob.glob(os.path.join(root, 'js', '*.js')) + [os.path.join(root, 'index.html')])
chars = set(text) | {chr(c) for c in range(0x20, 0x7f)} | set('‘’“”…·→←↑↓✓▶%~−×')
for src, name in zip(sys.argv[1:3], ['pretendard-sub', 'monoton-sub']):
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
