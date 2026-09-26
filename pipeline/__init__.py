"""London housing data pipeline: raw inputs -> web/public/data/*.json + db/london.sqlite."""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PROTO = ROOT / "reference" / "prototype"
SHIV = ROOT / "data-raw" / "shiv"
OUT_DATA = ROOT / "web" / "public" / "data"
OUT_DB = ROOT / "db" / "london.sqlite"
OUT_REPORT = Path(__file__).resolve().parent / "out" / "diff_report.md"
BUILD_DATE = "2026-09-26"
