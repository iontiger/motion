# Re-subset Pretendard Variable to the glyphs this page uses.
# usage: python3 tools/subset-font.py <PretendardVariable.woff2 or .ttf>
# (full font: npm package pretendard@1.3.9, dist/web/variable/woff2/PretendardVariable.woff2)
import glob, os, sys
from fontTools import subset
from fontTools.ttLib import TTFont

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = sys.argv[1]
text = ''.join(open(p, encoding='utf8').read() for p in glob.glob(os.path.join(root, 'js', '*.js')) + [os.path.join(root, 'index.html')])
cmap = TTFont(src).getBestCmap()
chars = set(text) | {chr(c) for c in range(0x20, 0x7f)} | set('‘’“”…·→←↑↓✓▶₩%~')
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
out = os.path.join(root, 'fonts', 'pretendard-sub.woff2')
f.flavor = 'woff2'
f.save(out)
print(f'{len(keep)} glyphs -> {out} ({os.path.getsize(out) // 1024} KB)')
