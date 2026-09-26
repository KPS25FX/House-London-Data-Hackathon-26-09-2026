# Diff report: Shiv recomputation vs prototype data.json

Seat values shipped in seats.json are the prototype snapshot (parity). This table shows how far the
Shiv CSV recomputation differs, per field, across the 75 seats.

| field | n | mean abs diff | max abs diff | max at seat | mean diff / mean value |
|---|---|---|---|---|---|
| owned | 75 | 0.02453 | 0.05 | E14001187 | 0.05% |
| privRent | 75 | 0.02467 | 0.05 | E14001169 | 0.08% |
| social | 75 | 0.02563 | 0.04988 | E14001137 | 0.11% |
| movedIn | 75 | 0.02533 | 0.05 | E14001073 | 0.19% |
| overcrowd | 75 | 0.02253 | 0.05 | E14001223 | 0.20% |
| regPer100 | 75 | 0.02813 | 0.05 | E14001236 | 0.03% |
| dwellings | 75 | 0 | 0 | None | 0.00% |
| completed7 | 75 | 0 | 0 | None | 0.00% |
| approvedNS | 75 | 0 | 0 | None | 0.00% |
| lapsed | 75 | 0 | 0 | None | 0.00% |
| refused | 75 | 0 | 0 | None | 0.00% |
| bf | 75 | 0 | 0 | None | 0.00% |
| ptal | 75 | 0.02539 | 0.04883 | E14001167 | 0.20% |
| medPrice | 75 | 0 | 0 | None | 0.00% |

## Notes

- Seat values are the prototype data.json snapshot (calibrated, used for parity); fields missing there are filled from Shiv CSVs. See pipeline/out/diff_report.md for Shiv vs prototype differences.
- missingMode=msoa_fallback: WhereToBuild MSOA gap data is not available, so the demand-scaling term of ALG-3a cannot be computed per MSOA. MSOA raw = seat raw (prototype) distributed across the seat's MSOAs in proportion to modelled capacity (exp(c0 + c1*ln(PTAL AI) + c2*ln(1 + brownfield per 1,000 dwellings)) - 1) * dwellings/1000. Sum of MSOA raw per seat equals seat raw exactly. MSOAs are assigned wholly to their Shiv pcon_code.
