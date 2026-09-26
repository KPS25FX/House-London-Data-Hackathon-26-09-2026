import pandas as pd,json,math,glob
from shapely import wkb
from shapely.geometry import shape
from shapely.ops import unary_union
pc=pd.read_parquet('vendor/mysociety-2025-constituencies/data/packages/parliament_con_2025/parl_constituencies_2025.parquet')
lon=pc[pc.region=='London']
G={r.gss_code:wkb.loads(r.geometry) for r in lon.itertuples()}
allg=unary_union(list(G.values())); minx,miny,maxx,maxy=allg.bounds
lat0=(miny+maxy)/2; k=math.cos(math.radians(lat0)); W=1000; s=W/((maxx-minx)*k); H=(maxy-miny)*s
P=lambda x,y:(round((x-minx)*k*s,1),round((maxy-y)*s,1))
def poly_d(p):
    out=[]
    for ring in [p.exterior]+list(p.interiors):
        pts=[P(c[0],c[1]) for c in ring.coords]
        if len(pts)<4: continue
        out.append('M'+'L'.join(f'{a},{b}' for a,b in pts[:-1])+'Z')
    return ''.join(out)
def geom_d(g,tol=0.00035):
    g=g.simplify(tol,preserve_topology=True)
    ps=[g] if g.geom_type=='Polygon' else list(g.geoms)
    return ''.join(poly_d(p) for p in ps if p.area>1e-7)
seats={c:geom_d(g) for c,g in G.items()}
cent={c:P(*g.representative_point().coords[0][:2]) for c,g in G.items()}
# boroughs from ward files
B=[]
for f in sorted(glob.glob('vendor/geo-lookups/boundaries/ward/E09*.geojson')):
    fc=json.load(open(f)); B.append(unary_union([shape(x['geometry']) for x in fc['features']]).buffer(0))
bl=''.join(geom_d(b.boundary.buffer(0) if False else b,0.0005) for b in B)
out={'w':W,'h':round(H,1),'seats':seats,'cent':cent,'boroughs':bl}
json.dump(out,open('data/geo.json','w'),separators=(',',':'))
import os;print(os.path.getsize('geo.json'),round(H))
