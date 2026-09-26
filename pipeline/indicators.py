"""Indicator catalogue with side tags (step_1.md, docs/04 section 2)."""

SIDES = ("market", "voter", "voter_composition", "voter_weight", "exposure", "outcome", "identity")

# key, label, side, unit, source, forestKey
_CAT = [
    # market
    ("wtbGap", "WhereToBuild gap (searchers minus listings)", "market", "count", "WhereToBuild (Warwick)", None),
    ("wtbPer1k", "WhereToBuild gap per 1,000 residents (market axis)", "market", "per 1,000 residents", "WhereToBuild (Warwick)", None),
    ("wtbPerKm2", "WhereToBuild gap per km2", "market", "per km2", "WhereToBuild (Warwick)", None),
    ("wtbFlag", "Imputed WhereToBuild MSOAs in seat", "market", "count", "Recovery process", None),
    ("afford", "House price to earnings ratio", "market", "ratio", "HoC Library via Forest", "parliament_house_price_to_earnings_ratio"),
    ("affEst", "Affordability estimated", "market", "bool", "Derived", None),
    ("medPrice", "Median price, year to Mar 2026", "market", "GBP", "HM Land Registry", None),
    ("hpg5", "5-year house price change", "market", "%", "HoC Library via Forest", "parliament_house_price_pct_change_5y"),
    # voter
    ("V", "Share concerned about housing shortages (voter axis)", "voter", "share 0-1", "Prime Radiant MRP via Forest (17 Aug 2026)", "mrp_concern_housing_shortages"),
    ("vEst", "V estimated by regression", "voter", "bool", "Derived", None),
    # voter composition
    ("owned", "Owner-occupied households", "voter_composition", "%", "Census 2021", "tenure_owned_pct"),
    ("outright", "Owned outright", "voter_composition", "%", "Census 2021", "tenure_outright_pct"),
    ("privRent", "Private renting", "voter_composition", "%", "Census 2021", "tenure_private_rent_pct"),
    ("social", "Social renting", "voter_composition", "%", "Census 2021", "tenure_social_rent_pct"),
    ("movedIn", "Moved in within the last year", "voter_composition", "%", "Census 2021", None),
    ("underocc", "Under-occupied (2+ spare bedrooms)", "voter_composition", "%", "Census 2021", None),
    ("overcrowd", "Overcrowded households", "voter_composition", "%", "Census 2021", "overcrowded_pct"),
    # voter weight
    ("regPer100", "Registered electors per 100 adults", "voter_weight", "per 100 adults", "ONS electoral statistics Dec 2025 / Census adults", None),
    # exposure
    ("won", "2024 winner", "exposure", "party", "HoC Library", None),
    ("second", "2024 runner-up", "exposure", "party", "HoC Library", None),
    ("majority", "2024 majority", "exposure", "votes", "HoC Library", None),
    ("marginPct", "2024 margin", "exposure", "pts", "HoC Library", "election_winner_margin_pct"),
    ("turnout", "2024 turnout", "exposure", "%", "HoC Library", "election_turnout_pct"),
    ("mp", "Current MP", "exposure", "name", "mySociety (Sep 2026)", None),
    ("mpParty", "MP party", "exposure", "party", "mySociety (Sep 2026)", None),
    ("mpNote", "MP note (e.g. vacant)", "exposure", "text", "mySociety (Sep 2026)", None),
    # outcome
    ("homes", "Completions per year, 2019/20-2024/25", "outcome", "homes/yr", "Planning London Datahub", None),
    ("completed7", "Completions 2019-2026", "outcome", "homes", "Planning London Datahub", None),
    ("approvedNS", "Approved, not started", "outcome", "homes", "Planning London Datahub", None),
    ("startedNC", "Started, not complete", "outcome", "homes", "Planning London Datahub", None),
    ("lapsed", "Lapsed permissions since 2019", "outcome", "homes", "Planning London Datahub", None),
    ("refused", "Refused since 2019", "outcome", "homes", "Planning London Datahub", None),
    ("pipeline", "Pipeline (approved + started)", "outcome", "homes", "Planning London Datahub", None),
    ("dwellings", "Existing dwellings 2025", "outcome", "count", "VOA", None),
    ("bf", "Brownfield max net dwellings", "outcome", "homes", "Brownfield land register", None),
    ("ptal", "Mean PTAL access index", "outcome", "index", "TfL", None),
    ("raw", "Model potential (uncalibrated)", "outcome", "homes/yr", "Pipeline (ALG-3a)", None),
    ("tops", "Top 3 missing neighbourhoods", "outcome", "list", "Pipeline (ALG-3a)", None),
    # identity
    ("code", "ONS PCON24 code", "identity", "code", "ONS", None),
    ("name", "Seat name", "identity", "text", "ONS", None),
    ("borough", "Main borough", "identity", "text", "ONS best-fit", None),
    ("boroughs", "All overlapping boroughs", "identity", "text", "ONS", None),
    ("q", "Hex-map column", "identity", "int", "Hand layout", None),
    ("r", "Hex-map row", "identity", "int", "Hand layout", None),
    ("pop", "Residents", "identity", "count", "Census 2021 / ONS MYE", None),
    ("adults", "Adults 18+", "identity", "count", "Census 2021", None),
    ("households", "Households", "identity", "count", "Census 2021", None),
]

SEAT_FIELDS = [k for k, *_ in _CAT]


def catalogue():
    out = []
    for key, label, side, unit, source, fk in _CAT:
        assert side in SIDES, key
        d = {"key": key, "label": label, "side": side, "unit": unit, "source": source}
        if fk:
            d["forestKey"] = fk
        out.append(d)
    return out
