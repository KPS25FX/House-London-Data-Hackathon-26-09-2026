import json
from collections import defaultdict

import pytest

from pipeline.build import build
from pipeline.indicators import SIDES

FILES = ["seats", "boroughs", "msoa", "policies", "postcodes", "indicators", "meta"]


@pytest.fixture(scope="module")
def out(tmp_path_factory):
    base = tmp_path_factory.mktemp("build")
    d1, d2 = base / "a", base / "b"
    build(d1, base / "a.sqlite", base / "a.md")
    build(d2, base / "b.sqlite", base / "b.md")
    data = {f: json.loads((d1 / f"{f}.json").read_text(encoding="utf-8")) for f in FILES}
    return d1, d2, data, base


def test_counts(out):
    _, _, d, _ = out
    assert len(d["seats"]) == 75
    assert len(d["boroughs"]) == 33
    assert len(d["msoa"]) == 1002
    assert [s["code"] for s in d["seats"]] == sorted(s["code"] for s in d["seats"])


def test_required_fields(out):
    _, _, d, _ = out
    for s in d["seats"]:
        for f in ["code", "name", "V", "wtbPer1k", "homes", "marginPct", "raw", "dwellings"]:
            assert s.get(f) is not None, (s["code"], f)
    for b in d["boroughs"]:
        assert b["lad"] and b["name"]
        assert 0 <= b["hdt"] <= 1.5


def test_msoa_raw_sums_to_seat(out):
    _, _, d, _ = out
    tot = defaultdict(float)
    for m in d["msoa"]:
        tot[m["pcon"]] += m["raw"]
        assert m["raw"] >= 0
    for s in d["seats"]:
        assert abs(tot[s["code"]] - s["raw"]) < 1e-6, s["code"]


def test_postcodes_valid(out):
    _, _, d, _ = out
    codes = {s["code"] for s in d["seats"]}
    assert len(d["postcodes"]) > 200
    for o, v in d["postcodes"].items():
        assert v["d"] is None or v["d"] in codes
        for inw, c in (v.get("x") or {}).items():
            assert len(inw) == 3
            assert c is None or c in codes


def test_policies(out):
    _, _, d, _ = out
    ids = [p["id"] for p in d["policies"]]
    assert len(ids) == len(set(ids))
    byid = {p["id"]: p for p in d["policies"]}
    for i in range(1, 8):
        p = byid[f"E0{i}"]
        assert p["kind"] == "evaluation" and p["effects"]
        assert p["evidence"]["scale"] in ("SMS", "GRADE", "none")
        for e in p["effects"]:
            assert e["direction"] in ("+", "-", "0", "mixed")
            assert e["certainty"] in ("high", "medium", "low")
    for i in range(1, 6):
        assert byid[f"L0{i}"]["kind"] == "evaluation"
    assert all(p["kind"] in ("library", "borough_profile", "evaluation") for p in d["policies"])
    assert sum(p["kind"] == "borough_profile" for p in d["policies"]) == 33


def test_indicator_sides(out):
    _, _, d, _ = out
    keys = [i["key"] for i in d["indicators"]]
    assert len(keys) == len(set(keys))
    assert {i["side"] for i in d["indicators"]} == set(SIDES)
    seat_keys = set(d["seats"][0])
    assert seat_keys == set(keys)  # every seat field is tagged with exactly one side


def test_meta(out):
    _, _, d, _ = out
    m = d["meta"]
    assert m["missingMode"] == "msoa_fallback" and m["notes"]
    assert m["model"]["coef"] == [1.3212, 0.2388, 0.162]
    for k in ["version", "generatedAt", "target", "vModel", "wtbTotal"]:
        assert m[k] is not None


def test_deterministic(out):
    d1, d2, _, base = out
    for f in FILES:
        assert (d1 / f"{f}.json").read_bytes() == (d2 / f"{f}.json").read_bytes(), f
