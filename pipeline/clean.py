"""Normalise units: percentages 0-100, HDT ratio 0-1, codes, nulls; keep only used columns."""
import math
import pandas as pd


def pct(s):
    s = pd.to_numeric(s, errors="coerce")
    return s * 100 if s.dropna().max() <= 1.0 else s


def ratio01(s):
    s = pd.to_numeric(s, errors="coerce")
    return s / 100 if s.dropna().max() > 1.5 else s


def nn(v):
    """Convert NaN/inf/numpy scalars to plain Python (None for missing)."""
    if v is None:
        return None
    if hasattr(v, "item"):
        v = v.item()
    if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
        return None
    return v


def seats(df):
    d = df.copy()
    d["pcon_code"] = d["pcon_code"].str.strip()
    hh = d["households"].replace(0, pd.NA)
    out = pd.DataFrame({
        "code": d["pcon_code"],
        "name": d["constituency"],
        "households": d["households"],
        "adults": d["adults_18plus_2021"],
        "owned": pct(d["pct_owner_occupied"]),
        "outright": d["hh_owned_outright"] / hh * 100,
        "privRent": pct(d["pct_private_rented"]),
        "social": d["hh_social_rented"] / hh * 100,
        "movedIn": pct(d["pct_moved_in_last_year"]),
        "overcrowd": pct(d["pct_overcrowded"]),
        "underocc": d["hh_occ_plus2"] / hh * 100,
        "regPer100": d["registered_per_100_adults"],
        "dwellings": d["dwellings_2025"],
        "completed7": d["pld_units_completed_2019_2026"],
        "approvedNS": d["pld_units_approved_not_started"],
        "startedNC": d["pld_units_started_not_complete"],
        "lapsed": d["pld_units_lapsed_since_2019"],
        "refused": d["pld_units_refused_since_2019"],
        "pipeline": d["pld_units_pipeline"],
        "bf": d["brownfield_max_dwellings"],
        "ptal": d["ptal_mean_access_index"],
        "medPrice": d["median_price_ye_mar2026_msoa_median"],
    })
    return out.set_index("code", drop=False)


def boroughs(df):
    d = df.copy()
    net6 = d["net_additions_2019_20_to_2024_25"]
    out = pd.DataFrame({
        "lad": d["lad_code"].str.strip(), "name": d["borough"],
        "hdt": ratio01(d["hdt_2025_measurement"]), "hdtCons": d["hdt_2025_consequence"],
        "netAdd6": net6, "netAdd2425": d["net_additions_2024_25"],
        "pldVsNet": d["pld_completions_vs_net_additions_pct"],
        "apprRate": pct(d["major_resi_approval_rate_since2019"]),
        "inTime": pct(d["major_resi_pct_in_time_since2019"]),
        "approved": d["pld_units_approved_since_2019"],
        "approvedNS": d["pld_units_approved_not_started"], "startedNC": d["pld_units_started_not_complete"],
        "lapsed": d["pld_units_lapsed_since_2019"], "refused": d["pld_units_refused_since_2019"],
        "pctSecond": d["pct_second_homes"], "secondHomes": d["ctb_second_homes"],
        "pctEmpty": d["pct_long_term_empty"], "emptyLT": d["ctb_empty_6months_plus"],
        "control": d["council_control_2026"], "largest": d["council_largest_party_2026"],
        "seats": d["council_seats_2026"],
        "underocc": pct(d["pct_underoccupied_2plus"]), "overcrowd": pct(d["pct_overcrowded"]),
        "privRent": pct(d["pct_private_rented"]), "owned": pct(d["pct_owner_occupied"]),
        "bf": d["brownfield_max_dwellings"],
    })
    return out.set_index("name", drop=False)


def msoa(df):
    d = df.copy()
    name = d["msoa_name"].where(d["msoa_name"].notna(), d["msoa21nm"])
    return pd.DataFrame({
        "code": d["msoa21cd"].str.strip(), "name": name,
        "pcon": d["pcon_code"].str.strip(), "lad": d["lad_code"].str.strip(),
        "dwellings": pd.to_numeric(d["dwellings_2025"], errors="coerce").fillna(0),
        "completed6": pd.to_numeric(d["pld_units_completed_fy2019_20_to_2024_25"], errors="coerce").fillna(0),
        "ptal": pd.to_numeric(d["ptal_mean_access_index"], errors="coerce"),
        "bf": pd.to_numeric(d["brownfield_max_dwellings"], errors="coerce").fillna(0),
    }).sort_values("code").reset_index(drop=True)
