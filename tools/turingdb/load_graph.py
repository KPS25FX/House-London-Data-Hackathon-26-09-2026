"""Load london_housing.jsonl into the running TuringDB server and print a summary."""
import os

from turingdb import TuringDB

GRAPH = "london_housing"

client = TuringDB(host=os.environ.get("TURINGDB_HOST", "http://localhost:6666"))

if GRAPH not in client.list_loaded_graphs():
    # Older servers lack LIST AVAILABLE GRAPHS, so try loading from disk first.
    try:
        client.load_graph(GRAPH)
    except Exception:
        client.query(f"LOAD JSONL 'london_housing.jsonl' AS {GRAPH}")
client.set_graph(GRAPH)

print(client.query("CALL db.labels()"))
print(client.query("CALL db.edgeTypes()"))
print(client.query("MATCH (n:Observation) RETURN count(n)"))
