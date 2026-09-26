"""Write db/london.sqlite from the built collections (rebuilt from scratch each run)."""
import json
import sqlite3
from pathlib import Path

SCHEMA = Path(__file__).with_name("schema.sql")


def _j(v):
    return json.dumps(v, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def write(path, seats, boroughs, msoa, indicators, policies, postcodes, meta):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists():
        path.unlink()
    con = sqlite3.connect(path)
    try:
        con.executescript(SCHEMA.read_text())
        con.executemany("INSERT INTO seat VALUES (?,?,?,?)",
                        [(s["code"], s["name"], s["borough"], _j(s)) for s in seats])
        con.executemany("INSERT INTO borough VALUES (?,?,?)", [(b["lad"], b["name"], _j(b)) for b in boroughs])
        con.executemany("INSERT INTO msoa VALUES (?,?,?,?,?,?,?,?,?)",
                        [(m["code"], m["name"], m["pcon"], m["lad"], m["dwellings"], m["built"], m["ptal"], m["bf"], m["raw"])
                         for m in msoa])
        con.executemany("INSERT INTO indicator VALUES (?,?,?,?,?,?)",
                        [(i["key"], i["label"], i["side"], i["unit"], i["source"], i.get("forestKey")) for i in indicators])
        rows = []
        for s in seats:
            for i in indicators:
                v = s.get(i["key"])
                if isinstance(v, bool) or not isinstance(v, (int, float)):
                    rows.append((s["code"], i["key"], None, None if v is None else (v if isinstance(v, str) else _j(v))))
                else:
                    rows.append((s["code"], i["key"], v, None))
        con.executemany("INSERT INTO seat_indicator VALUES (?,?,?,?)", rows)
        for p in policies:
            con.execute("INSERT INTO policy VALUES (?,?,?,?,?,?,?,?,?,?)",
                        (p["id"], p["title"], p["kind"], p.get("lever"), _j(p.get("holder")), p.get("scope"),
                         _j(p.get("evidence")), _j(p["tags"]), p["text"], _j(p["src"])))
            for n, e in enumerate(p.get("effects") or []):
                con.execute("INSERT INTO policy_effect VALUES (?,?,?,?,?,?,?)",
                            (p["id"], n, e["outcome"], e["direction"], e["certainty"], e["note"], e.get("who")))
        pc = []
        for out, v in postcodes.items():
            pc.append((out, "", v["d"]))
            for inw, c in (v.get("x") or {}).items():
                pc.append((out, inw, c))
        con.executemany("INSERT INTO postcode VALUES (?,?,?)", pc)
        con.executemany("INSERT INTO meta VALUES (?,?)", [(k, _j(v)) for k, v in meta.items()])
        con.commit()
    finally:
        con.close()
