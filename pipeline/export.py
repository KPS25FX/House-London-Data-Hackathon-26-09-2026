"""Deterministic JSON export to web/public/data/*.json (contract: docs/10_interfaces.md section 1)."""
import json
from pathlib import Path


def rnd(v, dp=4):
    if isinstance(v, bool) or v is None:
        return v
    if isinstance(v, float):
        r = round(v, dp)
        if r == int(r) and abs(r) < 2**53:
            return int(r) if v == int(v) else r
        return r
    if isinstance(v, dict):
        return {k: rnd(x, dp) for k, x in v.items()}
    if isinstance(v, (list, tuple)):
        return [rnd(x, dp) for x in v]
    return v


def dumps(obj):
    return json.dumps(rnd(obj), sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def write(out_dir, **collections):
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    for name, obj in collections.items():
        (out / f"{name}.json").write_text(dumps(obj) + "\n", encoding="utf-8", newline="\n")
