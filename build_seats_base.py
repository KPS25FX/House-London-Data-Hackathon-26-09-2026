import json, numpy as np, pandas as pd, collections, seats_raw as r
L=json.load(open('london_hex.json')); MPS=json.load(open('mps.json')); H=json.load(open('hoc.json'))
WT=json.load(open('wtb_london.json')); MS=json.load(open('msoa_london.json')); W=json.load(open('msoa_pcon_w.json'))
lad=pd.read_csv('vendor/geo-lookups/msoa_la.csv',usecols=['MSOACD','LADNM_ACTIVE'],low_memory=False).set_index('MSOACD')['LADNM_ACTIVE'].to_dict()
codes=sorted(L)
# dominant borough by area
bor=collections.defaultdict(lambda:collections.Counter())
for m,ws in W.items():
    for pc,w in ws.items(): bor[pc][lad.get(m,MS[m]['lad'])]+=w*MS[m]['area']
F=dict(r.F); F['E14001527']=(round((15.56+9.51)/2,2),)+F['E14001527'][1:]
# V model: add WTB demand per 1k residents
def feats(c):
    a,o,h,p,g=F[c]; d=WT['pcon'][c]['gap']/p*1000
    return [1,o,a,g,np.log(d)]
X=np.array([feats(c) for c in r.V]); y=np.array(list(r.V.values()))
b,*_=np.linalg.lstsq(X,y,rcond=None); r2=1-((y-X@b)**2).sum()/((y-y.mean())**2).sum(); print('R2',r2)
PN={'Lab':'Labour','Con':'Conservative','LD':'Lib Dem','RUK':'Reform UK','Green':'Green','Ind':'Independent','Spk':'Speaker'}
rows=[]
for c in codes:
    a,o,h,p,g=F[c]; w=WT['pcon'][c]
    if c in r.V: v=r.V[c]; vest=False
    else: v=float(np.clip(b@feats(c),0.05,0.6)); vest=True
    hh=H[c]; mp=MPS.get(c)
    rows.append(dict(code=c,name=L[c]['n'],q=L[c]['q'],r=L[c]['r'],borough=bor[c].most_common(1)[0][0],
        wtbGap=round(w['gap']),wtbPer1k=round(w['gap']/p*1000,1),wtbPerKm2=round(w['gpk']),wtbFlag=round(w['flagShare'],2),
        afford=a,affEst=c=='E14001527',outright=round(o,1),homes=h,pop=p,hpg5=g,V=round(v,4),vEst=vest,
        won=PN.get(hh['first'],hh['first']),second=PN.get(hh['second'],hh['second']),majority=hh['maj'],marginPct=round(hh['maj']/hh['valid']*100,2),turnout=hh['turnout'],
        mp=mp[0] if mp else None,mpParty=mp[1] if mp else None))
for x in rows:
    if x['code']=='E14001290': x['mpNote']='Vacant: Keir Starmer resigned the seat on 1 Sep 2026 (per mySociety records)'
# MSOA layer for postcode card detail (London top-level)
json.dump(dict(rows=rows,target=52287,vModel=dict(r2=round(r2,3),n=len(y)),wtbTotal=round(sum(x['wtbGap'] for x in rows))),open('data.json','w'),separators=(',',':'))
from scipy.stats import spearmanr
V=[x['V'] for x in rows if not x['vEst']]; Dm=[x['wtbPer1k'] for x in rows if not x['vEst']]
print('spearman demand/1k vs concern (measured seats):',spearmanr(Dm,V))
print('spearman afford vs wtb per1k', spearmanr([x['afford'] for x in rows],[x['wtbPer1k'] for x in rows]))
