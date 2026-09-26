import argparse
from .build import build


def main():
    ap = argparse.ArgumentParser(prog="python -m pipeline")
    sub = ap.add_subparsers(dest="cmd", required=True)
    b = sub.add_parser("build", help="build JSON data files and SQLite db")
    b.add_argument("--out", default=None, help="output dir for JSON (default web/public/data)")
    b.add_argument("--db", default=None, help="sqlite path (default db/london.sqlite)")
    b.add_argument("--report", default=None, help="diff report path")
    a = ap.parse_args()
    if a.cmd == "build":
        info = build(a.out, a.db, a.report)
        print(info)


if __name__ == "__main__":
    main()
