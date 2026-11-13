# Re-subset the fonts to the glyphs this page uses.
# usage: python3 tools/subset-font.py <srcdir>
# srcdir holds the originals:
#   PretendardVariable.woff2            npm pretendard@1.3.9, dist/web/variable/woff2/
#   BlackHanSans-Regular.ttf, GasoekOne-Regular.ttf, Orbit-Regular.ttf, NanumPenScript-Regular.ttf,
#   JetBrainsMono[wght].ttf             github.com/google/fonts (ofl/…)
import glob, os, sys
from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = sys.argv[1]
text = ''.join(open(p, encoding='utf8').read() for p in glob.glob(os.path.join(root, 'js', '*.js')) + [os.path.join(root, 'index.html')])
latin = {chr(c) for c in range(0x20, 0x7f)} | set('‘’“”…·—–→←♪♫★✦✧!?')
korean = set(text) | latin | set('·…‘’“”')
jobs = [
    ('PretendardVariable.woff2', 'pretendard-sub', korean, None),
    ('BlackHanSans-Regular.ttf', 'blackhansans-sub', korean, None),
    ('GasoekOne-Regular.ttf', 'gasoek-sub', korean, None),
    ('Orbit-Regular.ttf', 'orbit-sub', korean, None),
    ('NanumPenScript-Regular.ttf', 'nanumpen-sub', korean, None),
    ('JetBrainsMono[wght].ttf', 'jetbrainsmono-sub', latin, None),
]
for fn, name, chars, pin in jobs:
    f = TTFont(os.path.join(src, fn))
    if pin: f = instancer.instantiateVariableFont(f, pin)
    cmap = f.getBestCmap()
    keep = ''.join(sorted(c for c in chars if ord(c) in cmap))
    opts = subset.Options(); opts.flavor = 'woff2'; opts.layout_features = ['*']; opts.name_IDs = ['*']; opts.notdef_outline = pin is None; opts.notdef_glyph = pin is None
    s = subset.Subsetter(opts); s.populate(text=keep); s.subset(f)
    out = os.path.join(root, 'fonts', name + '.woff2'); f.flavor = 'woff2'; f.save(out)
    print(f'{len(keep)} glyphs -> {out} ({os.path.getsize(out) // 1024} KB)')
