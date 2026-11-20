import sys,re,html
def T(f):
  t=open(f).read(); t=re.sub(r'<script.*?</script>|<style.*?</style>','',t,flags=re.S); t=html.unescape(re.sub(r'<[^>]+>','\n',t)); return [l.strip() for l in t.split('\n') if l.strip()]
a=T(sys.argv[1]);b=T(sys.argv[2])
import difflib
for l in difflib.unified_diff(a,b,lineterm='',n=1): print(l[:200])
