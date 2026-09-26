"""Missing-homes model at MSOA level (ALG-3a), fallback mode.

WhereToBuild MSOA gap data is not available, so the demand-scaling term s_i
cannot be computed. We compute the capacity frontier per MSOA from PTAL and
brownfield, then distribute each seat's calibrated prototype `raw` across its
MSOAs proportionally to capacity, so that sum(raw_i in seat) == seat raw.
"""
import numpy as np
import pandas as pd

EPS = 0.01  # same PTAL floor as reference/prototype/missing_homes_model.py (clip lower=0.01)


def capacity(m, coef):
    c0, c1, c2 = coef
    dw = m["dwellings"].astype(float)
    bf1k = np.where(dw > 0, m["bf"] / dw.replace(0, np.nan) * 1000, 0.0)
    bf1k = np.nan_to_num(bf1k, nan=0.0)
    ptal = m["ptal"].fillna(EPS).clip(lower=EPS)
    fitted = c0 + c1 * np.log(ptal) + c2 * np.log1p(bf1k)
    return np.expm1(fitted) * dw / 1000.0


def msoa_raw(m, seat_raw, coef):
    """Return m with `cap`, `raw`, `built` columns. seat_raw: {pcon: raw}."""
    m = m.copy()
    m["cap"] = capacity(m, coef).clip(lower=0)
    m["built"] = (m["completed6"] / 6.0).round(4)
    m["raw"] = 0.0
    for pcon, idx in m.groupby("pcon").groups.items():
        idx = sorted(idx, key=lambda i: m.at[i, "code"])
        total = float(seat_raw.get(pcon, 0.0) or 0.0)
        w = m.loc[idx, "cap"].astype(float)
        if w.sum() <= 0:
            w = m.loc[idx, "dwellings"].astype(float) + 1e-9
        share = (w / w.sum() * total).round(4)
        # put rounding residual on the largest MSOA so the seat sum is exact
        big = share.idxmax()
        share[big] = round(total - (share.sum() - share[big]), 4)
        m.loc[idx, "raw"] = share
    return m
