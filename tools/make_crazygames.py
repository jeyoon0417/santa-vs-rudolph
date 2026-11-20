#!/usr/bin/env python3
"""Build the CrazyGames upload: inline three.js r128 + loaders and the Google Fonts into one index.html.

Usage:  python tools/make_crazygames.py SANTA_vs_RUDOLPH.html dist
Result: dist/index.html and dist/santa-vs-rudolph-crazygames.zip (upload the zip in the CrazyGames Developer Portal).
Only the CrazyGames SDK stays external (it must be loaded from sdk.crazygames.com).
"""
import base64, os, re, sys, urllib.request, zipfile

UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'
MIRROR = os.environ.get('LOCAL_MIRROR')  # for offline tests: a folder with files named after the URL's last path part


def fetch(url, binary=False):
    if MIRROR:
        data = open(os.path.join(MIRROR, url.rstrip('/').split('/')[-1].split('?')[0] or 'index'), 'rb').read()
    else:
        req = urllib.request.Request(url, headers={'User-Agent': UA})
        with urllib.request.urlopen(req, timeout=60) as r:
            data = r.read()
    return data if binary else data.decode('utf-8')


def inline_scripts(html):
    def repl(m):
        url = m.group(1)
        if 'sdk.crazygames.com' in url:
            return m.group(0)
        code = fetch(url)
        assert len(code) > 1000, 'download looks wrong: ' + url
        print('  inlined %-90s %7d bytes' % (url, len(code)))
        return '<script>/* ' + url + ' */\n' + code.replace('</script', '<\\/script') + '\n</script>'
    return re.sub(r'<script src="(https://[^"]+)"></script>', repl, html)


def inline_fonts(html):
    m = re.search(r'<link href="(https://fonts\.googleapis\.com/css2[^"]+)" rel="stylesheet" />', html)
    if not m:
        return html
    css = fetch(m.group(1).replace('&amp;', '&'))
    out = []
    # keep only the latin subset of every face (the game text is English)
    for block in re.findall(r'/\* ([\w-]+) \*/\s*(@font-face\s*{[^}]+})', css):
        subset, face = block
        if subset != 'latin':
            continue
        url = re.search(r'url\((https://[^)]+)\)', face).group(1)
        b64 = base64.b64encode(fetch(url, binary=True)).decode()
        out.append(face.replace(url, 'data:font/woff2;base64,' + b64))
    print('  inlined %d font faces' % len(out))
    html = html.replace(m.group(0), '<style>\n' + '\n'.join(out) + '\n</style>')
    html = re.sub(r'  <link rel="preconnect"[^>]*>\n', '', html)
    return html


def main():
    src, dist = sys.argv[1], sys.argv[2]
    html = open(src, encoding='utf-8').read()
    html = inline_fonts(inline_scripts(html))
    left = [u for u in re.findall(r'(?:src|href)="(https?://[^"]+)"', html) if 'sdk.crazygames.com' not in u]
    assert not left, 'external files left: %s' % left
    os.makedirs(dist, exist_ok=True)
    out = os.path.join(dist, 'index.html')
    open(out, 'w', encoding='utf-8').write(html)
    z = os.path.join(dist, 'santa-vs-rudolph-crazygames.zip')
    with zipfile.ZipFile(z, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as f:
        f.write(out, 'index.html')
    print('index.html %.2f MB, zip %.2f MB' % (os.path.getsize(out) / 1e6, os.path.getsize(z) / 1e6))


if __name__ == '__main__':
    main()
