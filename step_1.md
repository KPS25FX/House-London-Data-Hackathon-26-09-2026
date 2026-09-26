# Step 1: Separate the market side from the voter side

## The step

Define the market side and the voter side so that the indicators for each group's interests can be kept apart and measured.

## The answer

### How to separate them

The definitions come from `demand_taxonomy.md`.

| | **Market demand** | **Voter demand** |
|---|---|---|
| Question | Do people *outside* want to live here? | Do the people who *vote here* want more homes? |
| Whose preference | Would-be residents: searchers, movers, renters and buyers | Current residents on the electoral register |
| Revealed by | Behaviour: searches, prices, rents, competition for listings | Stated opinion and electoral weight: polling, turnout, margins |
| Political weight | None locally | Direct: they elect the MP and councillors |

**One-line test:** if a number changes when *outsiders* change their behaviour, it measures the market. If it changes only when *residents* change their minds or their voting power changes, it measures voters.

**How to classify a variable:**
- Measured on people who don't live here yet → **Market**
- An opinion or electoral fact about current residents → **Voter** (opinion or exposure)
- About who the residents are (tenure, age) → **Voter composition**. This explains voter demand but is never part of the voter axis.
- About homes built, approved, refused or already standing → **Outcome**. This belongs to neither side; it is what the two sides produce.

**Rules:**
1. Each axis is one variable. Market axis = `wtbPer1k` (WhereToBuild gap per 1,000 residents). Voter axis = `V` (MRP share concerned about housing).
2. `V` contains no composition. Tenure, age, turnout and registration explain `V`; they are not part of it.
3. Market demand contains no outcomes. Prices, completions and pipeline corroborate demand; they don't measure it.

---

### Available indicators from the Forest MCP server

Forest release `1eb7445a…`, generated 27 Aug 2026. These are national tables of 650 seats; filter them to the 75 London seats.

#### List 1: Voter indicators (voter mentality)

**Core stated opinion (the V axis)**
| Forest key | What it is | Source / date |
|---|---|---|
| `mrp_concern_housing_shortages` | % naming housing shortage as a top concern (this is V) | Prime Radiant MRP, 17 Aug 2026 |

**Other MRP opinion, for context. Never merge into V**
| Key | What it is |
|---|---|
| `mrp_concern_economic_crisis`, `_energy_costs`, `_food_prices`, `_immigration`, `_the_nhs`, `_crime`, `_climate_change`, `_war`, `_ai` | Competing concerns: how high housing ranks against other issues |
| `mrp_vote_labour`, `_conservatives`, `_reform_uk`, `_liberal_democrats`, `_green`, `_restore_britain`, `_other` | Current voting intention |
| `mrp_circle_labour`, `_conservatives`, `_green`, `_liberal_democrats`, `_other` | Which party residents think the people around them back |
| `mrp_devo_balance_is_about_right` | Appetite for devolution (relevant to Mayor call-in levers) |
| `mrp_leave_pct` | Modelled 2016 Leave share |

**Who the residents are (explains V, never part of it)**
| Key | What it is | Source |
|---|---|---|
| `tenure_owned_pct`, `tenure_outright_pct`, `tenure_mortgaged_pct` | Ownership: overall, outright, mortgaged | Census 2021 |
| `tenure_private_rent_pct`, `tenure_social_rent_pct` | Renters | Census 2021 |
| `age_18_24_pct`, `age_65_plus_pct`, `population_age_20_29_pct` … `_80_plus_pct` | Age profile | Census 2021 / ONS mid-year estimates 2024 |
| `overcrowded_pct`, `bedrooms_4_plus_pct` | Housing stress vs. space | Census 2021 |
| `income_net_after_housing_costs_gbp`, `budget_wiggle_room_gbp_pcm` | How much housing costs squeeze residents | ONS FYE2023 / HoC Library |
| `homelessness_applications_per_1000`, `housing_benefit_per_1000_households` | Housing distress among current residents | Forest-derived / DWP |
| `population_age_16_plus` | Adult population: the denominator for `regPer100` | ONS mid-year estimates 2024 |

**Political exposure (what drives the MP's incentive)**
| Key | What it is |
|---|---|
| `election_winner_margin_pct`, `election_winner_vote_share_pct`, `election_runnerup_vote_share_pct` | 2024 margin: the input to the closeness term |
| `election_turnout_pct`, `local_election_turnout_pct` | Turnout at general and local elections |
| `vote_lab`, `vote_con`, `vote_ld`, `vote_grn`, `vote_ref` | 2024 vote shares |
| `hold_con`, `hold_grn` (and other parties) | How often a party has won the seat, 2015–2024 |
| `mp_donations_gbp` | Donations accepted by the MP |

#### List 2: Market indicators (market mentality)

**Price and rent signals (supporting evidence for `wtbPer1k`, never replacing it)**
| Key | What it is | Source / date |
|---|---|---|
| `average_house_price_gbp` | Typical price paid (keeps history) | ONS UK HPI, Jan 2026 |
| `house_price_yoy_change_pct` | 1-year price change | ONS UK HPI, Jan 2026 |
| `parliament_house_price_pct_change_5y` | 5-year price change (`hpg5`) | HoC Library |
| `parliament_house_price_to_earnings_ratio` | Price-to-earnings ratio (`afford`) | HoC Library |
| `private_rent_median_gbp_pcm`, `rent_proxy_gbp_pcm` | Observed and modelled monthly rent | ONS private rents index |
| `median_gross_weekly_pay_gbp`, `median_annual_pay_gbp`, `median_income` | Earnings: the denominator for affordability | ONS pay survey (ASHE) 2025 |
| `commuting_net_income_ratio` | Above 1 means a dormitory seat (people live here but work elsewhere) | Forest economy model |
| `population_density_per_km2` | Urban intensity | Forest-derived |

**Investor and non-resident demand**
| Key | What it is |
|---|---|
| `overseas_owned_titles_per_1k_dwellings` | Titles held by overseas companies (Land Registry, May 2026) |
| `corporate_owned_titles_per_1k_dwellings` | Titles held by UK companies (Land Registry, Jun 2026) |
| `holiday_let_dwellings_pct` | Homes taken out of the long-term market (VOA 2025) |
| `property_income_share_pct` | Share of household income from rents and assets |

**Stock and supply response (outcomes, neither side)**
| Key | What it is |
|---|---|
| `homes_completed_annual` | MHCLG Live Table 253 completions, FY2025/26 |
| `empty_homes_pct` | Empty homes, 2026 |
| `accommodation_flat_pct`, `accommodation_detached_pct`, `accommodation_semi_detached_pct`, `bedrooms_1_pct` … `bedrooms_4_plus_pct` | Stock type |
| `mean_council_tax_band`, `council_tax_band_a_pct`, `council_tax_band_f_h_pct` | How valuable the stock is |
| `council_spending_housing_bestfit_gbp_per_person` | Council housing spend |

---

### Gaps and warnings

- **Forest has no direct market-demand measure.** WhereToBuild's `wtbGap`/`wtbPer1k` and searcher tightness aren't in the release, so everything in List 2 is supporting evidence only.
- **Also missing from Forest:** electoral registration rate (`regPer100` needs ONS electoral statistics), % moved in within the last year (`movedIn`), public transport access (PTAL), brownfield capacity, and the Planning London Datahub pipeline.
- **The MRP fields are flagged `excluded` for analysis in Forest.** Their values can be read, but Forest's own correlation tools treat them as tracker subjects, not indicators.
- **Use the `tenure_*` keys for London.** The similarly named `owned_pct`, `private_rent_pct` and `social_rent_pct` only cover the 75 Scotland and Northern Ireland seats.
- **Use `parliament_house_price_to_earnings_ratio`, not `affordability`.** The `affordability` key stores the same ratio as negative numbers, which would reverse the direction of any comparison.
- **`election_turnout_pct` and the `vote_*` keys are marked "exact_only".** Treat them as observed facts about the seat and join them on the exact 2024 election date.
