# Demo script: London Housing Gap Explorer

## Opening (30 sec)
**Who it's for:** housing campaigners, policy analysts (GLA, councils, think tanks) and MPs' teams.

**Why we built it:** the people who most need homes in an area (renters, movers, people priced out) don't vote there. The people who do vote there feel the shortage least. Building follows voters, not demand. This tool shows that gap seat by seat and turns it into a policy anyone can act on.

**What it does:** separates **market demand** (outsiders who want to live there) from **voter demand** (how worried residents are), measures missing homes, diagnoses the blocker, and writes a policy memo grounded in local data and past policy evidence.

---

## 1. Map (45 sec)
*Where is London short of homes?*
- All 75 London seats, shown as real boundaries or equal-size hexes.
- Colour by: missing homes, area type, MP leverage, outside demand, resident worry, seat margin, main blocker, scenario result, borough trend.
- Dashed outline means resident views are modelled (24 seats).
- Top-bar target switch: London Plan 52k / draft plan 55.8k / government 88k. Everything recalculates.

**Say:** "Dark means more homes missing. Switch to 88k and the whole of London shifts."

## 2. Seat brief (60 sec)
*Why is this seat short of homes, and what would help?*

**30-word rundown:** enter a postcode, get your MP, missing homes a year, resident worry, the main blocker with evidence strength, who can fix it, and a Claude-written policy memo as a PDF.

- Postcode or council → seat pickers.
- Diagnosis: 13 rules (homeowner resistance, stalled permissions, council refusals, brownfield, renters without a vote…), each rated strong / some / early.
- Structured argument: facts → diagnosis → options with past-policy effects → ask of the MP and the council.
- **Write a policy memo:** a 2–3 page PDF with cited sources. Follow-up questions can be asked after it.

**Demo:** type **SE15 5DQ** (Peckham), then write the memo.

## 3. Scenarios (45 sec)
*Which levers would close the gap?*
- **Four levers:**
  - build out stalled permissions
  - lift low-building seats to the London median
  - develop brownfield land
  - register private renters
- **Presets:** Unlock the pipeline, Match the median, Brownfield first, Renters' voice, All levers.
- **Live results:** London missing homes, extra homes a year, seats meeting their share, seats where new renter voters outnumber the 2024 majority.
- **Top-10 bars:** how much of each seat's shortfall is closed. Scenarios can be saved to compare.

**Say:** "Unlock the pipeline alone cuts missing homes from about 35,000 to 24,400 a year." Levers add up and overlap, so treat the combined total as an upper bound.

## 4. Trends (30 sec)
*How has affordability changed in each borough?*
- 9 measures: price-to-earnings, prices, rents, tenure, affordable completions, council homes, rough sleeping.
- Borough vs London chart, year slider with **Play**, borough ranking.
- **Show on map:** colours London by the chosen measure and year.

**Say:** "Barking's price-to-earnings ratio doubled since 2002."

## 5. Rankings (30 sec)
*Which seats should we prioritise?*
- All 75 seats ranked by **MP leverage**: missing homes × how winnable the MP is (close seat or residents split).
- Sort by missing homes, margin or stalled permissions. Filter by area type, party or council.
- A slider changes how leverage is weighted (close seat vs split residents).

## 6. Evidence (45 sec)
*Does the evidence back this policy here?*
- **Policy check:** pick a seat and a policy to see its fit, local risk and evidence strength, plus guardrails to attach and who acts.
- **Where this policy would do most:** the top 8 seats.
- **Every policy rated** for the chosen seat.
- **Past evaluations:** estate renewal, Housing First, the Towns Fund, the Levelling Up Fund, retrofit and others, each with what worked, what didn't and how strong the evidence is.
- **Why the gap persists:**
  - high-demand seats build less (7.8 vs 10.3 homes per 1,000 existing homes)
  - owner-dominated seats build 55% less
  - renter-heavy seats are under-registered (76 vs 87 per 100 adults)
  - owners worry less (22% vs 42%)
- Patterns, not proof of cause.

## 7. Data (15 sec)
- Import seat updates (JSON), time series (CSV) and policy evidence.
- Method and sources: WhereToBuild, Prime Radiant polling via Forest, Planning London Datahub, Census 2021, HoC election results, Land Registry.

---

## Close (20 sec)
"Market demand sets the size of the prize. Voter demand decides whether the MP moves. The tool shows both, finds the blocker, and hands you a policy with the evidence behind it."

**Under the hood:** Python pipeline → SQLite → typed TypeScript engine → Claude memo server. 60+ automated tests.
