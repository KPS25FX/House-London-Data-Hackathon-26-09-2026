"""Borough time series (series.json) and map geometry (geo.json) from the v2 prototype artifact.

series.json is extracted verbatim from the artifact's `let SERIES = {...}` literal rather than rebuilt from
"Manuel Data/london_housing_by_dataset_csv.zip": the artifact's metrics mix sources (e.g. the GLA CHAIN rough
sleeping quarter) that are not all in the zip, so extraction guarantees parity. core/src/trends.ts
`parseSeriesCsv` ports the artifact's importer for adding further London Datastore long-format files.
"""
import json
from pathlib import Path

from . import ROOT

ARTIFACT = ROOT / "reference" / "prototype_v2" / "artifact_v2.html"

NOTE_SERIES = ("series.json: extracted verbatim from the v2 prototype artifact SERIES literal (not rebuilt from the "
               "London Datastore zip), because some metrics (GLA CHAIN rough sleeping) are not in the zip.")
NOTE_GEO = "geo.json: seat SVG paths, centroids and borough outlines extracted from the v2 prototype artifact GEO literal."


def _literal(text, marker):
    i = text.index(marker) + len(marker)
    obj, _ = json.JSONDecoder().raw_decode(text[i:].lstrip())
    return obj


def load(path=ARTIFACT):
    text = Path(path).read_text(encoding="utf-8")
    series = _literal(text, "let SERIES = ")
    geo = _literal(text, "const GEO = ")
    return series, geo


def build(seat_codes, borough_names, path=ARTIFACT):
    series, geo = load(path)
    names = set(borough_names)
    metrics = []
    for m in series["metrics"]:
        n = len(m["years"])
        data = {b: list(v) for b, v in sorted(m["data"].items()) if b in names and len(v) == n}
        out = {k: v for k, v in m.items() if k != "data"}
        # The artifact's unit strings carry a mangled pound sign (U+FFFD); restore it.
        out["unit"] = str(m.get("unit", "")).replace("�", "£")
        out["years"] = [str(y) for y in m["years"]]
        out["data"] = data
        metrics.append(out)
    codes = set(seat_codes)
    g = {"w": geo["w"], "h": geo["h"],
         "seats": {c: p for c, p in sorted(geo["seats"].items()) if c in codes},
         "cent": {c: p for c, p in sorted(geo.get("cent", {}).items()) if c in codes}}
    if "boroughs" in geo:
        g["boroughs"] = geo["boroughs"]
    return {"metrics": metrics}, g
