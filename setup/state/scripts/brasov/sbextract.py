import re,sys,json,html,unicodedata
raw=open(sys.argv[1],encoding='utf-8').read()
# find longest JSON string containing 'Concerte'
best=''
for m in re.finditer(r'"((?:[^"\\]|\\.){20000,})"',raw):
    s=m.group(1)
    if 'Concerte' in s or 'Concerte'.encode('unicode_escape').decode() in s:
        if len(s)>len(best): best=s
try: h=json.loads('"'+best+'"')
except Exception as e:
    h=best.encode().decode('unicode_escape')
if '\\u003c' in h or '\\"' in h:
    try: h=json.loads('"'+h+'"')
    except: pass
h=unicodedata.normalize('NFC',h)
h=re.sub(r'<(script|style)[^>]*>.*?</\1>','',h,flags=re.S)
def a(m):
    href=m.group(1); t=re.sub('<[^>]+>','',m.group(2))
    return f'{t} [{html.unescape(href)}]'
h=re.sub(r'<a [^>]*href="([^"]*)"[^>]*>(.*?)</a>',a,h,flags=re.S)
h=re.sub(r'<(h[1-6]|p|li)\b[^>]*>',lambda m:'\n<'+m.group(1)+'> ',h)
h=re.sub(r'<[^>]+>','',h)
h=html.unescape(h)
h=re.sub(r'\n\s*\n+','\n',h)
print(len(best),file=sys.stderr)
open(sys.argv[2],'w').write(h)
