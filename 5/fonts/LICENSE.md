# Fonts

All four files are subsets (only the glyphs this page uses), converted to WOFF2, and all are released under the SIL Open Font License 1.1 (https://openfontlicense.org).

- `pretendard-sub.woff2`: Pretendard Variable 1.3.9. Copyright (c) 2021, Kil Hyung-jin, with Reserved Font Name Pretendard.
- `blackhansans-sub.woff2`: Black Han Sans. Copyright 2015 The Black Han Sans Project Authors (Zess Type).
- `anton-sub.woff2`: Anton. Copyright 2020 The Anton Project Authors (Vernon Adams).
- `nanummyeongjo-eb-sub.woff2`: Nanum Myeongjo ExtraBold. Copyright 2010 NAVER Corporation.

To regenerate after you change on-screen text, run `python3 tools/subset-font.py <PretendardVariable.woff2> <BlackHanSans-Regular.ttf> <Anton-Regular.ttf> <NanumMyeongjo-ExtraBold.ttf>` (needs `fonttools` and `brotli`).
