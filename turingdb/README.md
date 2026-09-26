# London housing graph in TuringDB

Loads `Manuel Data/london_housing_by_dataset_csv.zip` (6 datasets, 59,659 rows) into a
TuringDB graph called `london_housing`.

## Graph model

```
(:Dataset {name, source})-[:HAS_MEASURE]->(:Measure {key, dataset, name, unit})

(:Observation {dataset, measure, breakdown, period, year, value, unit, area_code})
    -[:FOR_AREA]->   (:Area {code, name, type})
    -[:OF_MEASURE]-> (:Measure)
    -[:IN_YEAR]->    (:Year {year})

(:Year)-[:NEXT_YEAR]->(:Year)
```

- One `Observation` per CSV row. `Measure.key` is `"<dataset>.<measure>"`, e.g.
  `house_prices.median_house_price`, `private_rents.median_monthly_rent`.
- `Area.type` values: `borough`, `region (London)`, `inner/outer London`, `region/nation`, `country`,
  plus rough-sleeping pseudo-areas (Heathrow, Tube line, ...) whose code is `X:<name>`.
- Non-numeric values would be kept in `raw_value` (none in the current data).
- `Measure` nodes are the natural place to tag market-side vs voter-side indicators
  (e.g. `SET m.side = 'market'`), see `../Plan.md`.

## Running it (Windows)

TuringDB publishes Linux/macOS wheels only, so everything runs in Docker. The server is the
official `turingdbai/turingdb` container named `turingdb` (ports 6666 API, 8080 visualizer,
data in the `turingdb_data` volume).

```powershell
cd turingdb
docker build -t london-housing-tools .
# 1. CSV zip -> JSONL in the server's data/ dir
docker run --rm -v turingdb_data:/turing -v "${PWD}\..:/repo:ro" london-housing-tools `
  sh -c "python build_graph.py && chown 1000:1000 /turing/data/london_housing.jsonl"
# 2. LOAD JSONL into the server (or load the existing on-disk graph)
docker run --rm -e TURINGDB_HOST=http://host.docker.internal:6666 london-housing-tools python load_graph.py
```

Browse it at http://localhost:8080 (graph `london_housing`).

## Example queries

```cypher
// Hackney price-to-earnings ratio over time
MATCH (a:Area {name:'Hackney'})<-[:FOR_AREA]-(o:Observation)-[:OF_MEASURE]->
      (m:Measure {key:'affordability_ratio.house_price_to_earnings_ratio'})
RETURN o.year, o.value ORDER BY o.year

// All measures available
MATCH (d:Dataset)-[:HAS_MEASURE]->(m:Measure) RETURN d.name, m.name, m.unit
```

Note: the running server version can't mix an aggregate with other return columns
(`RETURN a.type, count(a)` fails), so do group-bys in pandas on the returned DataFrame.
