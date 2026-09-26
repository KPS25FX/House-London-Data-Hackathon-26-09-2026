import json,numpy as np
D=json.load(open('wtb_raw.json')); M=json.load(open('msoa_london.json'))
def lin(serial):
    """Return list of (d, k, alpha, beta, amin, amax, sgn): value = sgn*(alpha*a+beta) for integer a in [amin,amax]"""
    sgn=-1 if serial<0 else 1; T=abs(serial)*1440
    out=[]
    for d in range(1,8):
        amin=0 if d==1 else 10**(d-1); amax=10**d-1
        kmax=10-d
        for k in range(1,kmax+1):
            # b = T-60a in [10^(k-1)?,10^k) ; allow leading zeros only when k==kmax
            lo=0 if k==kmax else 10**(k-1)
            a_lo=int(np.ceil((T-10**k+1e-6)/60)); a_hi=int(np.floor((T-lo)/60))
            a_lo=max(a_lo,amin); a_hi=min(a_hi,amax)
            if a_lo<=a_hi: out.append((d,k,1-60/10**k,T/10**k,a_lo,a_hi,sgn))
    return out
def area(c):
    s=D[c][0]; best=None
    for d,k,al,be,lo,hi,sg in lin(s):
        a=np.arange(lo,hi+1); v=sg*(al*a+be); i=np.argmin(abs(v-M[c]['area']))
        if best is None or abs(v[i]-M[c]['area'])<abs(best-M[c]['area']): best=v[i]
    return best
res={};stats={'uniq':0,'none':0,'multi':0}
for c in M:
    A=area(c); sg_,sp_=D[c][1],D[c][3]
    sols=[]
    for dp,kp,alp,bep,lop,hip,sgp in lin(sp_):
        a=np.arange(lop,hip+1,dtype=np.float64); vp=sgp*(alp*a+bep); vg=vp*A
        for dg,kg,alg,beg,log_,hig,sgg in lin(sg_):
            ag=(sgg*vg-beg)/alg
            ok=(np.abs(ag-np.round(ag))<2e-6*np.maximum(1,np.abs(vg))/1e3+1e-7)&(np.round(ag)>=log_)&(np.round(ag)<=hig)&(np.sign(vg)==sgg)
            for i in np.where(ok)[0]: sols.append((vp[i],vg[i]))
    if len(sols)==1: stats['uniq']+=1; res[c]=dict(area=A,gap=sols[0][1],gpk=sols[0][0])
    elif not sols: stats['none']+=1; res[c]=dict(area=A)
    else: stats['multi']+=1; res[c]=dict(area=A,cands=sols[:10])
print(stats)
json.dump(res,open('wtb_decoded_partial.json','w'))
import itertools
print(list(itertools.islice(((c,r) for c,r in res.items() if 'gap' in r),5)))
print(list(itertools.islice(((c,r) for c,r in res.items() if 'cands' in r),3)))
