"""Inline the data files into the page template -> dist/index.html (one self-contained file)."""
from pathlib import Path
root = Path(__file__).resolve().parent.parent
t = (root/"app/template.html").read_text()
for key, f in [("__DATA__","data.json"),("__PC__","pc.json"),("__KB__","kb.json"),("__BOROUGHS__","boroughs.json"),("__GEO__","geo.json")]:
    t = t.replace(key, (root/"data"/f).read_text())
(root/"dist").mkdir(exist_ok=True)
(root/"dist/index.html").write_text(t)
print("wrote dist/index.html", round(len(t)/1e6,2), "MB")
