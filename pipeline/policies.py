import json
import re
from pathlib import Path
"""Policy library: prototype K01-K52 + Manuel's evaluation cards (E01-E07) and lessons (L01-L05)."""

SRC = [{"name": "London Housing Policy Evidence Base (Manuel, 26 Sep 2026)", "url": "#evidence-base"}]


def fx(outcome, direction, certainty, note, who=None):
    d = {"outcome": outcome, "direction": direction, "certainty": certainty, "note": note}
    if who:
        d["who"] = who
    return d


EVALUATIONS = [
    dict(id="E01", title="Evaluation: estate renewal (What Works Growth, Jan 2015)",
         tags=["regeneration", "estate", "renewal", "prices", "renters", "evaluation"],
         text=("What Works Centre for Local Economic Growth review (Jan 2015) of area-based estate renewal in the UK and OECD. "
               "Prices, land values and rents rose (7 positive, 2 mixed of 9 studies). Employment, crime, health, education and "
               "deprivation mostly showed no effect. Housing quality improved in 1 of 4 studies. Existing residents were never "
               "tracked, so gains to the area may not be gains to the people who lived there. Evidence quality SMS 3-4."),
         lever="estate regeneration", holder=["council", "housing associations", "GLA"], scope="area-based, UK/OECD",
         evidence={"scale": "SMS", "score": "3-4"},
         effects=[fx("prices, land values and rents", "+", "medium", "7 positive, 2 mixed of 9 studies", "owners, landlords"),
                  fx("employment, crime, health, education, deprivation", "0", "medium", "mostly no effect"),
                  fx("housing quality", "mixed", "low", "improved in 1 of 4 studies"),
                  fx("outcomes for existing residents", "mixed", "low", "never tracked", "existing residents")]),
    dict(id="E02", title="Evaluation: neighbourhood saturation programmes (What Works Growth, 2018)",
         tags=["employment", "neighbourhood", "saturation", "earnings", "evaluation"],
         text=("What Works Growth review (2018) of Jobs-Plus, Employment Zones, StepUP and New Deal for Communities. Overall "
               "employment rose in 1 of 4 evaluations; earnings rose in 2 of 3 Jobs-Plus sites. Costs exceeded benefits (about 80p "
               "returned per 1 pound spent). NDC raised neighbourhood satisfaction. Evidence quality SMS 2-5."),
         lever="neighbourhood employment programmes", holder=["council", "DWP", "GLA"], scope="UK/US neighbourhoods",
         evidence={"scale": "SMS", "score": "2-5"},
         effects=[fx("employment", "mixed", "medium", "up in 1 of 4"),
                  fx("earnings", "+", "medium", "up in 2 of 3 Jobs-Plus sites"),
                  fx("value for money", "-", "medium", "about 80p benefit per 1 pound of cost"),
                  fx("neighbourhood satisfaction", "+", "low", "NDC raised satisfaction", "residents")]),
    dict(id="E03", title="Evaluation: London Homelessness Social Impact Bond (ICF for DCLG, Nov 2017)",
         tags=["homelessness", "rough sleeping", "social impact bond", "london", "evaluation"],
         text=("ICF evaluation for DCLG (Nov 2017) of the London Homelessness Social Impact Bond, 2012-2015, cohort of 830. 53% "
               "reached accommodation or reconnection; 241 sustained accommodation at 12 months (target 219); 63 entered jobs "
               "(target 30); the rough-sleeping target was missed. Targets were set by providers. Not scored on an evidence scale."),
         lever="outcomes-based homelessness commissioning", holder=["GLA", "council", "central government"],
         scope="London only, 2012-2015", evidence={"scale": "none"},
         effects=[fx("accommodation or reconnection", "+", "low", "53% of 830 cohort", "rough sleepers"),
                  fx("accommodation sustained at 12 months", "+", "low", "241 vs target 219", "rough sleepers"),
                  fx("employment", "+", "low", "63 into jobs vs target 30", "rough sleepers"),
                  fx("rough sleeping", "0", "low", "target missed; provider-set targets")]),
    dict(id="E04", title="Evaluation: Housing First (What Works Wellbeing / Sheffield, May 2018)",
         tags=["homelessness", "housing first", "wellbeing", "health", "evaluation"],
         text=("What Works Wellbeing / University of Sheffield review (May 2018). Housing First improves housing stability and "
               "physical health (high certainty, GRADE). It is not cost-saving and showed no effect on finances."),
         lever="Housing First", holder=["council", "housing associations", "NHS"], scope="international",
         evidence={"scale": "GRADE", "score": "high"},
         effects=[fx("housing stability", "+", "high", "GRADE high certainty", "homeless people"),
                  fx("physical health", "+", "high", "GRADE high certainty", "homeless people"),
                  fx("public cost", "0", "medium", "not cost-saving"),
                  fx("personal finances", "0", "medium", "no effect", "homeless people")]),
    dict(id="E05", title="Evaluation: Towns Fund (MHCLG / Frontier, Oct 2024-2025)",
         tags=["towns fund", "delivery", "capacity", "engagement", "evaluation"],
         text=("MHCLG / Frontier Economics evaluation (Oct 2024-2025) across 101 places. Inclusive boards and early consultation "
               "built local support. Delivery was constrained by council capacity, inflation and the lack of revenue funding. "
               "Not scored."),
         lever="place-based capital funds", holder=["central government", "council"], scope="101 English places",
         evidence={"scale": "none"},
         effects=[fx("local support", "+", "low", "inclusive boards and early consultation built support", "residents"),
                  fx("delivery", "-", "low", "constrained by council capacity, inflation, no revenue funding")]),
    dict(id="E06", title="Evaluation: Levelling Up Fund interventions (What Works Growth, Mar 2021)",
         tags=["transport", "levelling up", "prices", "renters", "evaluation"],
         text=("What Works Growth toolkit for Levelling Up Fund interventions (Mar 2021). Transport improvements raise nearby "
               "property prices. The claim that owners gain and renters lose is an inference, not measured. Inherits the SMS "
               "scores of the underlying studies."),
         lever="transport investment", holder=["TfL", "GLA", "central government"], scope="UK",
         evidence={"scale": "SMS", "score": "inherited"},
         effects=[fx("nearby property prices", "+", "medium", "transport raises nearby prices", "owners"),
                  fx("renter costs", "mixed", "low", "'owners gain, renters lose' is inference, not measured", "renters")]),
    dict(id="E07", title="Evaluation: Social Housing Decarbonisation Fund Demonstrator and Whole House Retrofit (Ipsos, 2023)",
         tags=["retrofit", "decarbonisation", "social housing", "energy bills", "evaluation"],
         text=("Ipsos evaluation for BEIS/DESNZ (2023) of the SHDF Demonstrator and Whole House Retrofit, including Energiesprong "
               "in Sutton. 1,143 of 2,273 homes were done by Apr 2023. Cost per home was 12% above plan against a planned 25% "
               "reduction. 37% of residents said bills fell, 20% said they rose. Not scored."),
         lever="retrofit of social housing", holder=["housing associations", "council", "central government"],
         scope="England incl. Sutton", evidence={"scale": "none"},
         effects=[fx("homes retrofitted", "mixed", "low", "1,143 of 2,273 by Apr 2023"),
                  fx("cost per home", "-", "low", "+12% vs planned -25%"),
                  fx("energy bills", "mixed", "low", "37% fell, 20% rose", "social tenants")]),
]

LESSONS = [
    ("L01", "Lesson: regeneration raises values, so renters may lose", ["regeneration", "renters", "prices", "displacement"],
     "Across estate renewal and transport evaluations (E01, E06), prices, land values and rents rise. Owners capture the gain; "
     "renters may face higher rents or displacement. Plan protections for existing renters."),
    ("L02", "Lesson: area gains are not resident gains", ["regeneration", "residents", "evaluation", "displacement"],
     "Area-based evaluations measure the place, not the people. Existing residents are rarely tracked (E01), so better area "
     "statistics can reflect population change rather than improved lives."),
    ("L03", "Lesson: person-centred support works", ["homelessness", "housing first", "support"],
     "Programmes that follow the person (Housing First E04, the London Homelessness SIB E03) show the clearest gains in "
     "housing stability and health."),
    ("L04", "Lesson: resident engagement drives success", ["engagement", "consultation", "support", "voice"],
     "Inclusive boards and early consultation built support for Towns Fund schemes (E05); neighbourhood programmes raised "
     "satisfaction when residents were involved (E02)."),
    ("L05", "Lesson: delivery capacity and timescales decide results", ["capacity", "delivery", "council", "timescales"],
     "Council capacity, inflation, missing revenue funding and short timescales held back Towns Fund (E05) and retrofit (E07) "
     "delivery. Fund capacity as well as capital."),
]


# Links each evaluation/lesson to the hypothesis ids and blocker categories it bears on
# (see core/src/policy/argument.ts matchingEvaluations), so options can carry past-policy effects.
DIAGNOSIS_LINKS = {
    "E01": ["social", "local_afford", "afford"],
    "E02": ["local_afford", "afford"],
    "E03": ["social", "local_afford", "afford"],
    "E04": ["social", "afford"],
    "E05": ["capacity", "council_no", "homeowner", "politics"],
    "E06": ["concentrated", "green_belt", "high_demand_unbuilt"],
    "E07": ["social", "stalled", "capacity"],
    "L01": ["social", "afford", "concentrated"],
    "L02": ["social", "concentrated"],
    "L03": ["local_afford", "afford"],
    "L04": ["homeowner", "politics", "council_no", "cant_vote", "voice"],
    "L05": ["capacity", "stalled"],
}


def _linked(pid, tags):
    return list(tags) + [t for t in DIAGNOSIS_LINKS.get(pid, []) if t not in tags]


V2_ARTIFACT = Path(__file__).resolve().parent.parent / "reference" / "prototype_v2" / "artifact_v2.html"


def v2_library(path=V2_ARTIFACT):
    """Library entries the v2 artifact adds beyond the prototype kb (K60-K69 evidence cards,
    cited by core/src/policyfit.ts). Parsed as JSON objects from the saved artifact; [] if absent."""
    if not path.exists():
        return []
    s, dec, out = path.read_text(encoding="utf8"), json.JSONDecoder(), {}
    for m in re.finditer(r'"id":\s*"(K\d\d)"', s):
        k = m.group(1)
        if k in out:
            continue
        try:
            o, _ = dec.raw_decode(s, s.rfind("{", 0, m.start()))
        except ValueError:
            continue
        if "title" in o and "text" in o:
            out[k] = o
    return [out[k] for k in sorted(out)]


def build(kb):
    out = []
    known = {k["id"] for k in kb}
    kb = list(kb) + [k for k in v2_library() if k["id"] not in known]
    for k in kb:
        out.append({"id": k["id"], "title": k["title"], "tags": list(k.get("tags", [])), "text": k["text"],
                    "src": k.get("src", []),
                    "kind": "borough_profile" if k["title"].startswith("Borough profile:") else "library"})
    for e in EVALUATIONS:
        out.append({**e, "tags": _linked(e["id"], e["tags"]), "kind": "evaluation", "src": SRC})
    for i, t, tags, text in LESSONS:
        out.append({"id": i, "title": t, "tags": _linked(i, tags), "text": text, "src": SRC, "kind": "evaluation"})
    return sorted(out, key=lambda p: p["id"])
