"""Missing-homes model (MSOA level) -> per-seat 'raw' potential.

Input : a DataFrame of London MSOAs (see README, 'Inputs') with columns
        c_per1k_yr, ptal_mean_access_index, bf_per1k, gap_per1k, dwellings_2025,
        actual_yr, pcon_code (plus msoa_pcon_w.json for area-weighted seat sums).
Output: per-MSOA cap/dem/raw and a per-seat 'raw' that the app calibrates to the
        London target in the browser: target_seat = total * raw_seat / sum(raw).
"""
import numpy as np, pandas as pd, json, sys
from scipy.optimize import linprog

Q = 0.8           # frontier quantile: what the best-performing fifth achieve
ELASTICITY = 0.5  # response of build rate to demand
CLIP = (0.25, 4.0)

def quantreg(y, X, q=Q):
    """Linear quantile regression via LP (Koenker-Bassett). X includes a constant."""
    n, k = X.shape
    c = np.r_[np.zeros(k), q*np.ones(n), (1-q)*np.ones(n)]
    A = np.c_[X, np.eye(n), -np.eye(n)]
    bounds = [(None, None)]*k + [(0, None)]*(2*n)
    res = linprog(c, A_eq=A, b_eq=y, bounds=bounds, method="highs")
    return res.x[:k]

def fit(m):
    y = np.log1p(m.c_per1k_yr.values)
    X = np.c_[np.ones(len(m)), np.log(m.ptal_mean_access_index.clip(lower=0.01)), np.log1p(m.bf_per1k)]
    b = quantreg(y, X)
    cap = np.expm1(X @ b)                               # homes / 1,000 dwellings / yr
    med = np.median(m.gap_per1k)
    dem = np.clip((m.gap_per1k/med)**ELASTICITY, *CLIP)
    out = m.assign(cap=cap, dem=dem, raw=cap*dem*m.dwellings_2025/1000)
    return b, med, out

def to_seats(out, weights_path="data/msoa_pcon_w.json"):
    W = json.load(open(weights_path))                  # {msoa: {pcon: share}}
    seat = {}
    for msoa, raw in zip(out.msoa21cd, out.raw):
        for pcon, w in W.get(msoa, {}).items():
            seat[pcon] = seat.get(pcon, 0) + raw*w
    return seat

if __name__ == "__main__":
    m = pd.read_pickle(sys.argv[1] if len(sys.argv) > 1 else "msoa.pkl")
    b, med, out = fit(m)
    print("coef", np.round(b, 4), "median gap/1k", round(med, 1))
    json.dump({"coef": [round(x, 4) for x in b], "q": Q, "elasticity": ELASTICITY, "median_gap_per1k": round(med, 1)},
              open("model_meta.json", "w"))
