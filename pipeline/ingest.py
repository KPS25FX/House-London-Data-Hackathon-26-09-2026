"""Load raw inputs (Shiv CSVs + prototype JSON snapshot)."""
import json
import pandas as pd
from . import PROTO, SHIV

INPUT_FILES = [
    SHIV / "london_constituency.csv", SHIV / "london_borough.csv", SHIV / "london_msoa.csv",
    PROTO / "data.json", PROTO / "boroughs.json", PROTO / "kb.json", PROTO / "pc.json",
]


def _json(p):
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def load():
    return {
        "shiv_seat": pd.read_csv(SHIV / "london_constituency.csv"),
        "shiv_borough": pd.read_csv(SHIV / "london_borough.csv"),
        "shiv_msoa": pd.read_csv(SHIV / "london_msoa.csv"),
        "data": _json(PROTO / "data.json"),
        "boroughs": _json(PROTO / "boroughs.json"),
        "kb": _json(PROTO / "kb.json"),
        "pc": _json(PROTO / "pc.json"),
    }
