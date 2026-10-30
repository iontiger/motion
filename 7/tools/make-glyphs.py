# Convert the glyphs this page needs into three.js typeface JSON (for extruded 3D letters).
# usage: python3 tools/make-glyphs.py <BagelFatOne-Regular.ttf> <Jost-500.ttf>
#   (github.com/google/fonts: ofl/bagelfatone; ofl/jost, instanced at wght 500 with fontTools.varLib.instancer)
#   Bagel Fat One draws the lyrics, Jost the K-A-D-A logo letters.
import glob, json, os, sys
from fontTools.ttLib import TTFont
from fontTools.pens.basePen import BasePen

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
text = ''.join(open(p, encoding='utf8').read() for p in glob.glob(os.path.join(root, 'js', '*.js')))
chars = sorted(set(c for c in text if '가' <= c <= '힣') | set('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ!?.,:-~·+&@%#/'))

class TypefacePen(BasePen):
    def __init__(self, gs):
        super().__init__(gs); self.o = []
    def f(self, *v): return ' '.join(str(round(x)) for x in v)
    def _moveTo(self, p): self.o.append('m ' + self.f(*p))
    def _lineTo(self, p): self.o.append('l ' + self.f(*p))
    def _qCurveToOne(self, p1, p2): self.o.append('q ' + self.f(p2[0], p2[1], p1[0], p1[1]))
    def _curveToOne(self, p1, p2, p3): self.o.append('b ' + self.f(p3[0], p3[1], p1[0], p1[1], p2[0], p2[1]))
    def _closePath(self): pass

def convert(path, chars, name):
    font = TTFont(path)
    cmap = font.getBestCmap(); gs = font.getGlyphSet(); upm = font['head'].unitsPerEm
    hhea = font['hhea']
    glyphs = {}
    for c in chars:
        g = cmap.get(ord(c))
        if g is None: print('missing', c); continue
        pen = TypefacePen(gs); gs[g].draw(pen)
        glyphs[c] = {'ha': gs[g].width, 'o': ' '.join(pen.o)}
    out = {'glyphs': glyphs, 'familyName': font['name'].getDebugName(1), 'resolution': upm, 'ascender': hhea.ascent, 'descender': hhea.descent,
           'underlinePosition': -100, 'underlineThickness': 50, 'boundingBox': {'yMin': hhea.descent, 'yMax': hhea.ascent, 'xMin': 0, 'xMax': upm}, 'original_font_information': {}}
    dst = os.path.join(root, 'fonts', name)
    json.dump(out, open(dst, 'w'), separators=(',', ':'))
    print(len(glyphs), 'glyphs ->', dst, os.path.getsize(dst) // 1024, 'KB')

convert(sys.argv[1], chars, 'bagel-glyphs.json')
convert(sys.argv[2], 'KAD', 'jost-glyphs.json')
