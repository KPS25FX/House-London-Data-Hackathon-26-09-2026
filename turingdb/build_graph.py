"""Convert the collated London housing CSVs into a TuringDB JSONL graph.

Graph model:
    (:Dataset {name, source})-[:HAS_MEASURE]->(:Measure {key, dataset, name, unit})
    (:Observation {dataset, measure, breakdown, period, year, value, unit, area_code})
        -[:FOR_AREA]->(:Area {code, name, type})
        -[:OF_MEASURE]->(:Measure)
        -[:IN_YEAR]->(:Year {year})
    (:Year)-[:NEXT_YEAR]->(:Year)

Output is Neo4j APOC JSON-export format, which TuringDB imports with LOAD JSONL.
"""
import json
import sys
import zipfile
from pathlib import Path

import pandas as pd

ZIP_PATH = Path(sys.argv[1] if len(sys.argv) > 1 else "/repo/Manuel Data/london_housing_by_dataset_csv.zip")
OUT_PATH = Path(sys.argv[2] if len(sys.argv) > 2 else "/turing/data/london_housing.jsonl")


def load_rows() -> pd.DataFrame:
    with zipfile.ZipFile(ZIP_PATH) as zf:
        frames = [pd.read_csv(zf.open(n), dtype=str) for n in zf.namelist() if n.endswith(".csv")]
    df = pd.concat(frames, ignore_index=True)
    df["value_num"] = pd.to_numeric(df["value"], errors="coerce")
    df["year"] = pd.to_numeric(df["year"], errors="coerce").astype("Int64")
    # Rough-sleeping "other locations" (Heathrow, Tube line, ...) have no ONS code.
    df["area_code"] = df["area_code"].fillna("X:" + df["area_name"])
    return df.fillna({"breakdown": "", "unit": "", "period": ""})


def main() -> None:
    df = load_rows()
    lines: list[str] = []
    ids: dict[tuple, int] = {}

    def node(key: tuple, label: str, props: dict) -> int:
        if key not in ids:
            ids[key] = len(ids)
            lines.append(json.dumps({"type": "node", "id": str(ids[key]), "labels": [label], "properties": props}))
        return ids[key]

    edges: list[tuple[int, int, str]] = []

    for code, g in df.groupby("area_code"):
        node(("Area", code), "Area", {"code": code, "name": g["area_name"].iloc[0], "type": g["area_type"].iloc[0]})

    for name, g in df.groupby("dataset"):
        d = node(("Dataset", name), "Dataset", {"name": name, "source": g["source"].mode().iloc[0]})
        for (measure, unit), _ in g.groupby(["measure", "unit"]):
            m = node(("Measure", name, measure), "Measure",
                     {"key": f"{name}.{measure}", "dataset": name, "name": measure, "unit": unit})
            edges.append((d, m, "HAS_MEASURE"))

    years = sorted(int(y) for y in df["year"].dropna().unique())
    for y in years:
        node(("Year", y), "Year", {"year": y})
    for a, b in zip(years, years[1:]):
        edges.append((ids[("Year", a)], ids[("Year", b)], "NEXT_YEAR"))

    for r in df.itertuples(index=False):
        props = {
            "dataset": r.dataset, "measure": r.measure, "breakdown": r.breakdown,
            "period": r.period, "unit": r.unit, "area_code": r.area_code,
        }
        if pd.notna(r.year):
            props["year"] = int(r.year)
        if pd.notna(r.value_num):
            props["value"] = float(r.value_num)
        else:
            props["raw_value"] = str(r.value)  # e.g. "[x]" = suppressed
        o = node(("Observation", len(ids)), "Observation", props)
        edges.append((o, ids[("Area", r.area_code)], "FOR_AREA"))
        edges.append((o, ids[("Measure", r.dataset, r.measure)], "OF_MEASURE"))
        if pd.notna(r.year):
            edges.append((o, ids[("Year", int(r.year))], "IN_YEAR"))

    for i, (s, e, t) in enumerate(edges):
        lines.append(json.dumps({"type": "relationship", "id": str(i), "label": t,
                                 "start": {"id": str(s)}, "end": {"id": str(e)}, "properties": {}}))

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"{len(ids)} nodes, {len(edges)} edges -> {OUT_PATH}")


if __name__ == "__main__":
    main()
