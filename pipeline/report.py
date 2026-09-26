"""Diff report: Shiv-recomputed seat values vs prototype data.json."""
from pathlib import Path

FIELDS = ["owned", "privRent", "social", "movedIn", "overcrowd", "regPer100", "dwellings",
          "completed7", "approvedNS", "lapsed", "refused", "bf", "ptal", "medPrice"]


def compute(proto_rows, shiv):
    res = []
    for f in FIELDS:
        diffs = []
        worst = (0.0, None)
        for r in proto_rows:
            a = r.get(f)
            b = shiv.at[r["code"], f] if r["code"] in shiv.index else None
            if a is None or b is None or b != b:
                continue
            d = abs(float(a) - float(b))
            diffs.append(d)
            if d > worst[0]:
                worst = (d, r["code"])
        mean = sum(diffs) / len(diffs) if diffs else float("nan")
        scale = sum(abs(float(r[f])) for r in proto_rows if r.get(f) is not None) / max(1, len(proto_rows))
        res.append({"field": f, "n": len(diffs), "mean_abs": mean, "max_abs": worst[0], "max_seat": worst[1],
                    "rel_mean": mean / scale if scale else float("nan")})
    return res


def write(path, res, notes=()):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    lines = ["# Diff report: Shiv recomputation vs prototype data.json", "",
             "Seat values shipped in seats.json are the prototype snapshot (parity). This table shows how far the",
             "Shiv CSV recomputation differs, per field, across the 75 seats.", "",
             "| field | n | mean abs diff | max abs diff | max at seat | mean diff / mean value |",
             "|---|---|---|---|---|---|"]
    for r in res:
        lines.append(f"| {r['field']} | {r['n']} | {r['mean_abs']:.4g} | {r['max_abs']:.4g} | {r['max_seat']} | {r['rel_mean']:.2%} |")
    if notes:
        lines += ["", "## Notes", ""] + [f"- {n}" for n in notes]
    path.write_text("\n".join(lines) + "\n", encoding="utf-8", newline="\n")
