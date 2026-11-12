# Re-subset the fonts to the glyphs this page uses.
# usage: python3 tools/subset-font.py <srcdir>
# srcdir holds: PretendardVariable.woff2 (npm pretendard@1.3.9, dist/web/variable/woff2/),
#               BlackHanSans-Regular.ttf, Anton-Regular.ttf (github.com/google/fonts, ofl/…)
import glob, os, sys
from fontTools import subset
from fontTools.ttLib import TTFont

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = sys.argv[1]
text = ''.join(open(p, encoding='utf8').read() for p in glob.glob(os.path.join(root, 'js', '*.js')) + [os.path.join(root, 'index.html')])
chars = set(text) | {chr(c) for c in range(0x20, 0x7f)} | set('‘’“”…·—–→←↑↓×▲▼₩¥+-%')
for fn, name in [('PretendardVariable.woff2', 'pretendard-sub'), ('BlackHanSans-Regular.ttf', 'blackhansans-sub'), ('Anton-Regular.ttf', 'anton-sub')]:
    f = TTFont(os.path.join(src, fn))
    cmap = f.getBestCmap()
    keep = ''.join(sorted(c for c in chars if ord(c) in cmap))
    miss = ''.join(sorted(c for c in chars if ord(c) not in cmap and ord(c) > 0x7f))
    opts = subset.Options(); opts.flavor = 'woff2'; opts.layout_features = ['*']; opts.name_IDs = ['*']
    s = subset.Subsetter(opts); s.populate(text=keep); s.subset(f)
    out = os.path.join(root, 'fonts', name + '.woff2'); f.flavor = 'woff2'; f.save(out)
    print(f'{len(keep)} glyphs -> {out} ({os.path.getsize(out) // 1024} KB)' + (f'  not in font: {miss[:60]}' if name != 'anton-sub' and miss else ''))
