# Demand That Can't Vote: engineering documents

These documents specify the London housing tool as a properly engineered product in this repo. They are reverse-engineered from the prototype Claude artifact "Demand That Can't Vote" (https://claude.ai/artifact/VkWcxQdq7L9TuoLHqQmsBK) and grounded in `demand_taxonomy.md` and `step_1.md`.

| # | Document | Answers |
|---|---|---|
| 01 | [Product requirements](01_product_requirements.md) | Why are we building this, for whom, and what is in scope? |
| 02 | [Functional specification](02_functional_specification.md) | What must the system do? Numbered, testable requirements (FR-xx) and non-functional requirements (NFR-xx). |
| 03 | [Feature specification](03_feature_specification.md) | How does each feature look and behave? UI, interactions, states and acceptance criteria per feature (F01–F15). |
| 04 | [Data specification](04_data_specification.md) | What data exists, its fields, units, sources and storage model. |
| 05 | [Algorithm specification](05_algorithm_specification.md) | Exact formulas: classification, missing homes, persuadability, priority, hypotheses, blockers, similarity, retrieval. |
| 06 | [System architecture](06_system_architecture.md) | How the pieces fit together, with the stack decisions still open. |
| 07 | [Test and acceptance plan](07_test_and_acceptance_plan.md) | How we prove the rebuild matches the prototype and meets the spec. |

## Conventions

- **Prototype** means the Claude artifact. **The tool** means the rebuild in this repo.
- Requirement IDs: `FR-<area>-<n>` (functional), `NFR-<n>` (non-functional), `F<nn>` (feature).
- Priority uses MoSCoW: **M**ust, **S**hould, **C**ould, **W**on't (this release).
- "Seat" means a 2024 Westminster parliamentary constituency in London (75 seats, ONS PCON24 codes).
- Statements marked **[Prototype]** describe behaviour observed in the artifact. Statements marked **[New]** are additions needed to build the tool properly.

## Status

Draft 1, 26 Sep 2026. Open decisions are listed in [06 System architecture §7](06_system_architecture.md#7-open-decisions).
