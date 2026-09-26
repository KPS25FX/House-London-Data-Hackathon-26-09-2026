"""Orchestrates ingest -> clean -> model -> export/db/report."""
import hashlib
from pathlib import Path

from . import BUILD_DATE, OUT_DATA, OUT_DB, OUT_REPORT
from . import clean, db, export, indicators, ingest, model, policies, report
from .clean import nn

BOROUGH_FIELDS = ["lad", "name", "hdt", "hdtCons", "netAdd6", "netAdd2425", "pldVsNet", "apprRate", "inTime", "approved",
                  "approvedNS", "startedNC", "lapsed", "refused", "pctSecond", "pctEmpty", "secondHomes", "emptyLT",
                  "control", "largest", "seats", "underocc", "overcrowd", "privRent", "owned", "bf"]


def input_hash():
    h = hashlib.sha256()
    for p in ingest.INPUT_FILES:
        h.update(Path(p).read_bytes())
    return h.hexdigest()[:8]


def build_seats(proto_rows, shiv):
    seats = []
    for r in proto_rows:
        s = {}
        for f in indicators.SEAT_FIELDS:
            v = r.get(f)
            if v is None and f in shiv.columns and r["code"] in shiv.index:
                v = nn(shiv.at[r["code"], f])
            s[f] = v
        seats.append(s)
    return sorted(seats, key=lambda s: s["code"])


def build_boroughs(proto, shiv):
    out = []
    names = sorted(set(proto) | set(shiv.index))
    for name in names:
        p = proto.get(name, {})
        b = {}
        for f in BOROUGH_FIELDS:
            v = name if f == "name" else p.get(f)
            if v is None and name in shiv.index:
                v = nn(shiv.at[name, f])
            b[f] = v
        out.append(b)
    return sorted(out, key=lambda b: b["lad"])


def build_postcodes(pc, rows):
    codes = [r["code"] for r in rows]

    def code(i):
        i = int(i)
        return None if i < 0 else codes[i]

    out = {}
    for outward in sorted(pc):
        d, ex = pc[outward][0], (pc[outward][1] if len(pc[outward]) > 1 else {}) or {}
        x = {}
        for idx, s in ex.items():
            for k in range(0, len(s), 3):
                x[s[k:k + 3]] = code(idx)
        e = {"d": code(d)}
        if x:
            e["x"] = dict(sorted(x.items()))
        out[outward] = e
    return out


def build(out_dir=None, db_path=None, report_path=None):
    out_dir = Path(out_dir or OUT_DATA)
    db_path = Path(db_path or OUT_DB)
    report_path = Path(report_path or OUT_REPORT)

    raw = ingest.load()
    data = raw["data"]
    rows = data["rows"]
    shiv_seat = clean.seats(raw["shiv_seat"])
    shiv_bor = clean.boroughs(raw["shiv_borough"])
    m = clean.msoa(raw["shiv_msoa"])

    seats = build_seats(rows, shiv_seat)
    boroughs = build_boroughs(raw["boroughs"], shiv_bor)

    seat_raw = {s["code"]: s["raw"] for s in seats}
    m = model.msoa_raw(m, seat_raw, data["model"]["coef"])
    msoa = [{"code": r.code, "name": nn(r.name), "pcon": r.pcon, "lad": r.lad, "dwellings": nn(r.dwellings),
             "built": nn(r.built), "ptal": nn(r.ptal), "bf": nn(r.bf), "raw": nn(r.raw)}
            for r in m.itertuples()]

    pols = policies.build(raw["kb"])
    inds = indicators.catalogue()
    postcodes = build_postcodes(raw["pc"], rows)

    notes = [
        "Seat values are the prototype data.json snapshot (calibrated, used for parity); fields missing there are filled "
        "from Shiv CSVs. See pipeline/out/diff_report.md for Shiv vs prototype differences.",
        "missingMode=msoa_fallback: WhereToBuild MSOA gap data is not available, so the demand-scaling term of ALG-3a "
        "cannot be computed per MSOA. MSOA raw = seat raw (prototype) distributed across the seat's MSOAs in proportion "
        "to modelled capacity (exp(c0 + c1*ln(PTAL AI) + c2*ln(1 + brownfield per 1,000 dwellings)) - 1) * dwellings/1000. "
        "Sum of MSOA raw per seat equals seat raw exactly. MSOAs are assigned wholly to their Shiv pcon_code.",
        "MSOA built = Datahub completions FY2019/20-2024/25 / 6 (homes/yr).",
        "Seat 'boroughs' is kept as the prototype '; '-separated string.",
    ]
    meta = {
        "version": f"{BUILD_DATE}.build-{input_hash()}",
        "generatedAt": f"{BUILD_DATE}T00:00:00Z",
        "target": data["target"], "vModel": data["vModel"], "wtbTotal": data["wtbTotal"], "model": data["model"],
        "missingMode": "msoa_fallback", "notes": notes,
    }

    export.write(out_dir, seats=seats, boroughs=boroughs, msoa=msoa, policies=pols, postcodes=postcodes,
                 indicators=inds, meta=meta)
    db.write(db_path, seats, boroughs, msoa, inds, pols, postcodes, meta)
    res = report.compute(rows, shiv_seat)
    report.write(report_path, res, notes[:2])
    return {"seats": len(seats), "boroughs": len(boroughs), "msoa": len(msoa), "policies": len(pols),
            "postcodes": len(postcodes), "indicators": len(inds), "version": meta["version"], "out": str(out_dir)}
