# 08 Formal model

This document states the tool's maths with sets, types and functions. Every symbol maps 1:1 to a name in [10_interfaces.md](10_interfaces.md) (the types and the public `core` API) and every formula restates [05_algorithm_specification.md](05_algorithm_specification.md) (ALG-n). If this document and docs/05 disagree, docs/05 wins and this document must be fixed.

Each definition is followed by the TypeScript signature that implements it. Public functions are the ones in docs/10 §2. Functions marked *(internal)* are helpers in the named `core/src` module and are not exported from `index.ts`.

Notation: $[\![P]\!] \in \{0,1\}$ is the Iverson bracket (1 when $P$ is true). $\lvert X\rvert$ is cardinality. $f^{-1}(y)$ is the preimage. $\mathbb{B} = \{\top,\bot\}$.

---

## 1. Universe and sets

| Symbol | Set | Size | Key | Data file / type |
|---|---|---|---|---|
| $S$ | Westminster seats (PCON24) | 75 | `code` | `seats.json` : `SeatRow[]` |
| $B$ | London boroughs (LAD) | 33 | `lad` (and `name`) | `boroughs.json` : `Borough[]` |
| $M$ | Neighbourhoods (MSOA 2021) | 1,002 | `code` | `msoa.json` : `Msoa[]` |
| $K$ | Policy documents | ~64 | `id` | `policies.json` : `Policy[]` |
| $H$ | Hypothesis ids | 14 | `HypId` | `Hypothesis` |

The policy set is a disjoint union by origin:

$$K = K_{\text{lib}} \sqcup K_{\text{bp}} \sqcup K_{\text{eval}} \sqcup K_{\text{lesson}}$$

- $K_{\text{lib}}$: library entries `K01`–`K52` with `kind = 'library'`, excluding borough profiles.
- $K_{\text{bp}}$: entries titled "Borough profile: {borough}", `kind = 'borough_profile'`. There is at most one per borough, so $\text{bp}: B \rightharpoonup K_{\text{bp}}$ is a partial injection.
- $K_{\text{eval}} = \{E01,\dots,E07\}$: Manuel's past-policy evaluation cards, `kind = 'evaluation'`.
- $K_{\text{lesson}} = \{L01,\dots,L05\}$: cross-cutting lessons drawn from the cards. They are stored with `kind = 'evaluation'` because docs/10 has no separate kind for them.

**Membership maps.**

$$\mu : M \to S \quad (\texttt{Msoa.pcon}), \qquad \beta : S \to B \quad (\texttt{SeatRow.borough}, \text{best-fit}), \qquad \lambda : M \to B \quad (\texttt{Msoa.lad})$$

$\mu$ is a best-fit assignment, so the fibres $\{\mu^{-1}(s)\}_{s \in S}$ partition $M$. $\beta$ is surjective because every borough contains at least one best-fit seat. $\beta$ is not injective: a borough typically holds 2–3 seats. A seat's overlapping boroughs are `boroughs` : $S \to \mathcal{P}(B)$, and $\beta(s) \in \texttt{boroughs}(s)$.

```ts
type SeatCode = string; type Lad = string; type MsoaCode = string; type PolicyId = string;
// μ: (m: Msoa) => m.pcon      β: (s: SeatRow) => s.borough
```

---

## 2. Indicator space

An **indicator** is a function $\iota : S \to C_\iota$, where the codomain $C_\iota$ is $\mathbb{R}$, $\mathbb{B}$, a string set or an array. It is one field of `SeatRow`. The indicator set $I$ is partitioned by side:

$$I = I_{\text{mkt}} \sqcup I_{\text{vot}} \sqcup I_{\text{comp}} \sqcup I_{\text{wt}} \sqcup I_{\text{exp}} \sqcup I_{\text{out}} \sqcup I_{\text{id}}$$

| Block | `Side` | Members (field names) |
|---|---|---|
| $I_{\text{mkt}}$ | `market` | `wtbGap`, **`wtbPer1k`**, `wtbPerKm2`, `wtbFlag`, `afford`, `affEst`, `medPrice`, `hpg5` |
| $I_{\text{vot}}$ | `voter` | **`V`**, `vEst` |
| $I_{\text{comp}}$ | `voter_composition` | `owned`, `outright`, `privRent`, `social`, `movedIn`, `underocc`, `overcrowd` |
| $I_{\text{wt}}$ | `voter_weight` | `regPer100` |
| $I_{\text{exp}}$ | `exposure` | `won`, `second`, `majority`, `marginPct`, `turnout`, `mp`, `mpParty`, `mpNote` |
| $I_{\text{out}}$ | `outcome` | `homes`, `completed7`, `approvedNS`, `startedNC`, `lapsed`, `refused`, `pipeline`, `dwellings`, `bf`, `ptal`, `raw`, `tops` |
| $I_{\text{id}}$ | `identity` | `code`, `name`, `borough`, `boroughs`, `q`, `r`, `pop`, `adults`, `households` |

Within $I_{\text{mkt}}$, `afford`, `medPrice` and `hpg5` are *corroborating*: they may appear in hypotheses but never in the axis. The two **axes** are $A_M = \texttt{wtbPer1k} \in I_{\text{mkt}}$ and $A_V = \texttt{V} \in I_{\text{vot}}$.

```ts
interface Indicator { key: keyof SeatRow; label: string; side: Side; unit: string; source: string; forestKey?: string }
// side(ι) is the `side` column of indicators.json
```

### 2.1 Separation axioms

Let $\text{Mp}, \text{Vp}$ be the percentile maps of §3. Write $\text{rows} \sim_X \text{rows}'$ when two datasets agree on every field in $X$.

**Axiom 1 (two-variable classification).** There is a fixed $f : [0,1]^2 \to T$ such that
$$\text{type}(s) = f(\text{Mp}(s), \text{Vp}(s)) \quad \forall s \in S.$$
Equivalently, the classification is invariant under changes to any field other than the axes: if $\text{rows} \sim_{\{\texttt{wtbPer1k},\,\texttt{V}\}} \text{rows}'$ then $\text{type} = \text{type}'$ pointwise. This invariance is acceptance test AT-04.

**Axiom 2 (no composition in V).** The voter axis is an observed column and is not defined from composition:
$$A_V \notin \operatorname{span}\{\iota : \iota \in I_{\text{comp}} \cup I_{\text{wt}}\}$$
This is a structural constraint on the *definition*, not a claim of statistical independence. The two may correlate; the owned–V correlation is $\rho \approx -0.65$. The 24 seats with `vEst = true` hold a regression estimate that *is* in that span (ALG-15). That is why Rule 4 excludes them from the voice-test statistics: $S_{\text{meas}} = \{s : \neg\,\texttt{vEst}(s)\}$ with $\lvert S_{\text{meas}}\rvert = 51$.

**Axiom 3 (no outcomes in market demand).** The market axis takes no input from $I_{\text{out}}$ and no price signal:
$$\operatorname{inputs}(A_M) \cap \big(I_{\text{out}} \cup \{\texttt{afford}, \texttt{medPrice}, \texttt{hpg5}\}\big) = \varnothing$$

**Axiom 4 (late merge).** The two sides meet only in `prioRaw` (§5): $\texttt{gap}$ depends on $I_{\text{mkt}} \cup I_{\text{out}}$ only, and $\texttt{dP}$ depends on $I_{\text{vot}} \cup I_{\text{exp}}$ only.

### 2.2 Side diagnostic as a decision function

For a candidate variable $x$, define predicates on its metadata: $\text{nonres}(x)$ means it is measured on people who don't live here yet; $\text{opinion}(x)$ means it is an opinion of current residents; $\text{weight}(x)$ means it is registration or eligibility; $\text{elect}(x)$ means it is an electoral fact; $\text{homes}(x)$ means it is about homes built, approved, refused or standing; $\text{who}(x)$ means it is about who the residents are. Then `side` is a first-match decision list:

$$
\text{side}(x) =
\begin{cases}
\texttt{market} & \text{nonres}(x)\\
\texttt{voter} & \neg\text{nonres}(x) \wedge \text{opinion}(x)\\
\texttt{voter\_weight} & \text{weight}(x)\\
\texttt{exposure} & \text{elect}(x)\\
\texttt{outcome} & \text{homes}(x)\\
\texttt{voter\_composition} & \text{who}(x)\\
\texttt{identity} & \text{otherwise}
\end{cases}
$$

```ts
type SideQuestion = { nonres: boolean; opinion: boolean; weight: boolean; elect: boolean; homes: boolean; who: boolean };
function side(x: SideQuestion): Side   // (internal, pipeline tags indicators.json with it; core only reads `side`)
```

---

## 3. Ranking and classification (ALG-1, ALG-2)

**Percentile rank with ties (mid-rank).** For a key $k : S \to \mathbb{R}$ with $n = \lvert S\rvert$ and a value $v$:
$$\text{lo}(v) = \lvert\{s : k(s) < v\}\rvert,\quad \text{hi}(v) = \lvert\{s : k(s) \le v\}\rvert,\quad \text{pctRank}_k(v) = \frac{\text{lo}(v) + \text{hi}(v)}{2n}.$$
Properties: $\text{pctRank}_k(k(s)) \in \big[\tfrac{1}{2n}, 1 - \tfrac{1}{2n}\big]$. Tied values share a rank. The map is monotone non-decreasing in $v$. With no ties, the $j$-th smallest value gets $(j - \tfrac12)/n$, so $\tfrac1n\sum_s \text{pctRank}_k(k(s)) = \tfrac12$.

$$\text{Mp} = \text{pctRank}_{\texttt{wtbPer1k}},\quad \text{Vp} = \text{pctRank}_{\texttt{V}},\quad \text{bpkP} = \text{pctRank}_{\texttt{bpk}}$$
All three are over all 75 seats, including estimated `V`.

**Tier.** $\text{tier} : [0,1] \to \texttt{Tier} = \{0,1,2\}$:
$$\text{tier}(p) = [\![p \ge \tfrac13]\!] + [\![p \ge \tfrac23]\!],\qquad \text{Mt} = \text{tier}\circ\text{Mp},\ \text{Vt} = \text{tier}\circ\text{Vp}.$$

**Area type.** $T = \{\texttt{locked}, \texttt{ready}, \texttt{worried}, \texttt{settled}, \texttt{middle}\}$ and $\tau : \{0,1,2\}^2 \to T$ is the lookup table:

| $\tau(\text{Mt},\text{Vt})$ | Vt = 0 | Vt = 1 | Vt = 2 |
|---|---|---|---|
| **Mt = 0** | settled | middle | worried |
| **Mt = 1** | middle | middle | middle |
| **Mt = 2** | locked | middle | ready |

$\text{type} = \tau\circ(\text{Mt},\text{Vt})$, so $f = \tau \circ (\text{tier}\times\text{tier})$ in Axiom 1.

**Lemma 3.1 (counts partition).** $\sum_{t\in T} \lvert \text{type}^{-1}(t)\rvert = \lvert S\rvert = 75$.
*Proof.* $\text{type}$ is a total function $S \to T$, so its fibres are pairwise disjoint and their union is $S$. The snapshot gives 15 + 3 + 3 + 11 + 43 = 75. ∎

```ts
function pctRank(sorted: number[], v: number): number          // (internal) core/src/rank.ts
function tier(p: number): Tier                                  // (internal) core/src/classify.ts
function areaType(Mt: Tier, Vt: Tier): AreaType                 // (internal) core/src/classify.ts
// all three are applied inside compute(rows, msoa, settings): Seat[]
```

---

## 4. Missing homes (ALG-3)

**4.1 Frontier (pipeline, per MSOA $i \in M$).** Let $y_i = \log\!\big(1 + 1000\,\texttt{built}_i/\texttt{dwellings}_i\big)$, $x_{1i} = \log \texttt{ptal}_i$ and $x_{2i} = \log\!\big(1 + 1000\,\texttt{bf}_i/\texttt{dwellings}_i\big)$. The frontier is the $q = 0.8$ quantile regression
$$\hat c = \arg\min_{c\in\mathbb{R}^3} \sum_{i\in M} \rho_{0.8}\big(y_i - c_0 - c_1 x_{1i} - c_2 x_{2i}\big),\qquad \rho_q(u) = u\,(q - [\![u<0]\!]),$$
with $\hat c = (1.3212,\ 0.2388,\ 0.162)$. Price is excluded by Axiom 3.

$$\text{cap}_i = \big(e^{\hat y_i} - 1\big)\frac{\texttt{dwellings}_i}{1000},\qquad \sigma_i = \operatorname{clip}\!\Big(\big(g_i / 135.3\big)^{1/2},\ 0.25,\ 4\Big),\qquad \texttt{raw}_i = \text{cap}_i\,\sigma_i \ge 0$$

where $g_i$ is the WhereToBuild gap per 1,000 dwellings and 135.3 is the London median (`meta.model.median_gap_per1k`). The seat value is $\texttt{raw}(s) = \sum_{i\in\mu^{-1}(s)} \texttt{raw}_i$.

**4.2 Calibration (runtime).** For a London target $T > 0$ (`Settings.total`), with $R = \sum_{i\in M} \texttt{raw}_i = \sum_{s\in S}\texttt{raw}(s) > 0$:
$$\kappa_T = \frac{T}{R},\qquad \texttt{target}(s) = \kappa_T\,\texttt{raw}(s),\qquad \sum_{s}\texttt{target}(s) = T.$$

**4.3 Gap, neighbourhood aggregation (`missingMode = 'msoa'`, the default).**
$$\text{gap}^{\text{msoa}}_s(T) = \sum_{i\in\mu^{-1}(s)} \max\big(0,\ \kappa_T\,\texttt{raw}_i - \texttt{built}_i\big)$$

**Seat-level variant (`missingMode = 'seat'`, prototype parity):**
$$\text{gap}^{\text{seat}}_s(T) = \max\big(0,\ \kappa_T\,\texttt{raw}(s) - \texttt{homes}(s)\big)$$

**Proposition 4.1 (monotone in T).** For each $s$, $T \mapsto \text{gap}^{\text{msoa}}_s(T)$ is non-decreasing, and so is $\text{gap}^{\text{seat}}_s$.
*Proof.* $\kappa_T = T/R$ is increasing in $T$ and $\texttt{raw}_i \ge 0$, so $T\mapsto\kappa_T\texttt{raw}_i - \texttt{built}_i$ is non-decreasing. $u \mapsto \max(0,u)$ is non-decreasing, so each summand is non-decreasing. A finite sum of non-decreasing functions is non-decreasing. The seat case is a single summand. ∎
It follows that London's total $\sum_s \text{gap}_s(T)$ is non-decreasing: about 35k at 55,800 and about 63k at 88,000.

**Proposition 4.2 (neighbourhood ≥ seat).** Assume consistency, $\texttt{homes}(s) = \sum_{i\in\mu^{-1}(s)} \texttt{built}_i$. Then $\text{gap}^{\text{msoa}}_s(T) \ge \text{gap}^{\text{seat}}_s(T)$.
*Proof.* Let $u_i = \kappa_T\texttt{raw}_i - \texttt{built}_i$. The function $h(u) = \max(0,u)$ is convex with $h(0)=0$, so it is subadditive: $h(a+b) \le h(a) + h(b)$. By induction, $h(\sum_i u_i) \le \sum_i h(u_i)$. The left side is $\text{gap}^{\text{seat}}_s$ and the right side is $\text{gap}^{\text{msoa}}_s$. (Equivalently by Jensen: $h(\bar u) \le \overline{h(u)}$, scaled by $\lvert\mu^{-1}(s)\rvert$.) Equality holds iff all $u_i$ with $i \in \mu^{-1}(s)$ have the same sign (or are 0). This means the seat variant lets overbuilding neighbourhoods offset underbuilding ones. ∎

Built rate: $\texttt{bpd}(s) = 1000\,\texttt{homes}(s)/\max(\texttt{dwellings}(s),1)$.

```ts
function calibrate(rows: SeatRow[], total: number): number /* κ_T */          // (internal) core/src/missing.ts
function gapFor(s: SeatRow, msoaOfSeat: Msoa[], kappa: number, mode: MissingMode): number  // (internal)
```

---

## 5. Leverage (ALG-4, ALG-5)

With $w = \texttt{Settings.wClose} \in [0,1]$:
$$\text{close}(s) = \frac{1}{1 + \texttt{marginPct}(s)/5} \in (0,1],\qquad \text{swing}(s) = 1 - \lvert 2\,\text{Vp}(s) - 1\rvert \in [\tfrac1n, 1]$$
$$\text{dP}(s) = w\,\text{close}(s) + (1-w)\,\text{swing}(s)\quad\text{(convex combination, so } \text{dP}\in[0,1])$$
$$\text{prioRaw}(s) = \frac{\text{gap}(s)}{\max_{s'}\text{gap}(s')}\,\text{dP}(s),\qquad \text{prio}(s) = 100\,\frac{\text{prioRaw}(s)}{\max_{s'}\text{prioRaw}(s')}$$
$\text{rank}(s) = 1 + \lvert\{s' : \text{prio}(s') > \text{prio}(s)\}\rvert$ (ties are then broken by stable sort order).

**Properties.** (i) $\text{prio}(s) \in [0,100]$, because $\text{prioRaw} \ge 0$ and it is divided by its maximum. (ii) $\text{prio}(s^\ast) = 100$ for every $s^\ast \in \arg\max \text{prioRaw}$. (iii) Guard: if $\max \text{gap} = 0$ or $\max\text{prioRaw}=0$, set $\text{prio} \equiv 0$ (the formula is otherwise $0/0$). (iv) $\text{prio}$ is invariant under positive rescaling of `gap`, so it depends on $T$ only through the *shape* of the gaps. (v) At $w=1$ the ranking uses closeness only; at $w=0$ it uses swing only (AT-05).

$$\text{bpk}(s) = \frac{\texttt{homes}(s)}{\max(\texttt{wtbGap}(s),1)},\qquad \text{bpkP} = \text{pctRank}_{\text{bpk}}$$

```ts
function leverage(s: Seat, wClose: number): Pick<Derived,'close'|'swing'|'dP'>   // (internal) core/src/leverage.ts
```

---

## 6. Distance and similar seats (ALG-9)

Feature map $\varphi : S \to [0,1]^5$:
$$\varphi(s) = \Big(\text{Mp}(s),\ \text{Vp}(s),\ \tfrac{\texttt{owned}(s)}{100},\ \min\!\big(1, \tfrac{\texttt{marginPct}(s)}{40}\big),\ \text{bpkP}(s)\Big)$$
$$d(s,s') = \lVert\varphi(s) - \varphi(s')\rVert_2^2 = \sum_{j=1}^{5}\big(\varphi_j(s)-\varphi_j(s')\big)^2$$

$d$ is symmetric with $d(s,s)=0$, but it is a **squared** metric and not a true metric: the triangle inequality fails. Take the points 0, 1, 2 on one axis: $d(0,2) = 4 > d(0,1) + d(1,2) = 2$. It is also only a pseudo-metric on $S$, since $\varphi$ need not be injective. Nearest-neighbour queries are unaffected because $\sqrt{\cdot}$ is strictly increasing, so $d$ and $\lVert\cdot\rVert_2$ induce the same ordering:
$$\text{similar}_n(s) = \operatorname*{n\text{-}argmin}_{s' \in S\setminus\{s\}} d(s,s') = \operatorname*{n\text{-}argmin}_{s'\neq s}\lVert\varphi(s)-\varphi(s')\rVert_2$$
with $n=3$ and ties broken by input order.

```ts
function similarSeats(s: Seat, seats: Seat[], n = 3): Seat[]
```

---

## 7. Hypotheses (ALG-7) and blocker (ALG-8)

Each hypothesis $j$ is a triple of functions: a predicate $h_j : S \to \mathbb{B}$, a confidence $c_j : S \to \texttt{Confidence}$ and a score $\sigma_j : S \to \mathbb{N}$. Also $\Lambda_j \subseteq K$ is its fixed library set. Let $P = \text{bpkP}(s)$, $B = \texttt{boroughs.json}[\beta(s)]$ and $\text{GB}$ = {Barnet, Bexley, Bromley, Croydon, Enfield, Harrow, Havering, Hillingdon, Hounslow, Kingston upon Thames, Redbridge, Sutton}. The confidence ladder is
$$\text{conf}(n) = \texttt{strong}\ (n\ge3),\quad \texttt{moderate}\ (n=2),\quad \texttt{tentative}\ (n\le1).$$
Define $e(s) = \texttt{tentative}$ if `vEst` else `moderate`. Write $\Sigma = \texttt{approvedNS}+\texttt{lapsed}$.

| $j$ | `HypId` | $h_j(s)$ | $c_j(s)$ | $\sigma_j(s)$ | $\Lambda_j$ |
|---|---|---|---|---|---|
| 1 | `homeowner` | $\texttt{owned}\ge58 \wedge P<0.4$ | $\text{conf}(n_1)$, $n_1 = 1+[\![\text{Vt}=0]\!]+[\![\texttt{outright}\ge30]\!]-[\![\texttt{vEst}]\!]$ | $3+n_1$ | K12, K04, K06, K08 (+K02 if $\beta(s)\in\text{GB}$) |
| 2 | `stalled` | $\Sigma > 0.8\max(\texttt{completed7},1) \wedge \Sigma>1000$ | $\text{conf}(n_2)$, $n_2 = 1+[\![\texttt{lapsed}>300]\!]+[\![\text{Mt}\ge1]\!]$ | $3+n_2$ | K04, K05, K10 |
| 3 | `council_no` | $B.\texttt{apprRate}<75 \wedge \texttt{refused}>300$ | moderate if $B.\texttt{apprRate}<70$ else tentative | 3 | K04, K06 |
| 4 | `brownfield` | $\texttt{bf}>3000 \wedge \text{gap}>150 \wedge \texttt{bf}>5\,\text{gap}$ | moderate | 2 | K01, K04, K14 |
| 5 | `cant_vote` | $\texttt{regPer100}<75 \wedge \texttt{privRent}\ge30$ | strong if $\texttt{regPer100}<72$ else moderate | $2+[\![\texttt{marginPct}<10]\!]$ | K08, K12 |
| 6 | `high_demand_unbuilt` | $\text{Mt}=2 \wedge P<0.4 \wedge (\texttt{hpg5}<3 \vee \texttt{owned}<50)$ | $\text{conf}(n_6)$, $n_6 = 1+[\![\texttt{hpg5}<0]\!]+[\![\text{Vt}\ge1]\!]$ | $3+n_6$ | K05, K04, K07 |
| 7 | `capacity` | $\text{Vt}=2 \wedge \text{Mt}\ge1 \wedge P<0.5$ | $e(s)$ | 4 | K04, K06, K13 |
| 8 | `concentrated` | $P>0.8$ | strong if $\text{Mt}=0$ else moderate | 3 | K07, K10, K02, K12 |
| 9 | `local_afford` | $\text{Mt}=0 \wedge \text{Vt}=2$ | $e(s)$ | 3 | K04, K11, K01 |
| 10 | `social` | $\texttt{social}\ge33 \wedge \text{Vt}\ge1$ | $e(s)$ | 3 | K04, K01, K13 |
| 11 | `renters_decide` | $\texttt{privRent}\ge30 \wedge \texttt{marginPct}<15 \wedge \neg(\texttt{regPer100}<75)$ | strong if $\texttt{marginPct}<5$ else moderate | $2+[\![\texttt{marginPct}<5]\!]$ | K08, K09 |
| 12 | `exposed` | $\texttt{marginPct}<5 \wedge \neg h_{11}(s)$ | strong | 2 | K09 |
| 13 | `green_belt` | $\beta(s)\in\text{GB} \wedge \text{Mt}\ge1$ | tentative | 1 | K02 |
| 0 | `none` | $\bigwedge_{j=1}^{13}\neg h_j(s)$ | tentative | 0 | K12, K14 |

**Output.** $\mathcal{H}(s) = \operatorname{sort}_{\sigma\downarrow}\big[\,j : h_j(s)\,\big]$ is a stable sort, so ties keep rule order $j$. $H(s) \subseteq \texttt{HypId}$ is its id set, and $\lvert H(s)\rvert \ge 1$ always (the `none` rule guarantees totality).

**Blocker.** Let $X = \{\texttt{exposed}, \texttt{green\_belt}, \texttt{none}\}$ and $E(s) = H(s)\setminus X$. Then
$$\text{topBlocker}(s) = \begin{cases}\arg\max_{j \in E(s)} (\sigma_j(s), -j) & E(s)\neq\varnothing\\ \texttt{null} & \text{otherwise}\end{cases}$$
The key is lexicographic: highest score first, then earliest rule. $\text{blockCat} = \gamma\circ\text{topBlocker}$, where $\gamma : \texttt{HypId}\cup\{\texttt{null}\} \to \texttt{BlockerCat}$ is:

| `BlockerCat` | $\gamma^{-1}$ |
|---|---|
| politics | homeowner, council_no |
| stalled | stalled, high_demand_unbuilt |
| capacity | capacity |
| land | brownfield |
| afford | local_afford, social |
| voice | cant_vote, renters_decide |
| concentrated | concentrated |
| none | null (and exposed, green_belt, none by construction) |

**Side discipline.** Each $h_j$ reads at most the sides named in the taxonomy (§9). For example, $h_1$ reads $I_{\text{comp}}$ and the outcome rank $P$, and $h_{12}$ reads $I_{\text{exp}}$ only.

```ts
function hypotheses(s: Seat, ctx: Ctx): Hypothesis[]     // Hypothesis.id = HypId, .c = c_j, .s = σ_j, .k = Λ_j
function topBlocker(s: Seat, ctx: Ctx): Hypothesis | null
function blockCat(s: Seat, ctx: Ctx): BlockerCat
```

---

## 8. Retrieval (ALG-10, BM25)

Tokenise with $\text{tok}(x)$: lowercase, split on $[^{a\text{-}z0\text{-}9\%\text{-}]$, keep tokens of length > 1, and drop stop words. A document is $D_k = \text{tok}(\texttt{title}) \mathbin{+\!\!+} \text{tok}(\texttt{tags})^{\times2} \mathbin{+\!\!+} \text{tok}(\texttt{text})$. For a query $q$ over $N = \lvert K_{\text{lib}}\rvert$ documents, with $k_1 = 1.2$ and $b = 0.75$:
$$\text{idf}(t) = \ln\!\Big(1 + \frac{N - \text{df}(t) + 0.5}{\text{df}(t)+0.5}\Big),\qquad \text{BM25}(q,k) = \sum_{t\in q}\text{idf}(t)\,\frac{\text{tf}_{t,k}\,(k_1+1)}{\text{tf}_{t,k} + k_1\big(1-b+b\,\lvert D_k\rvert/\overline{\lvert D\rvert}\big)}$$
The query is $q(s) = \text{tok}(\beta(s) \cdot \texttt{name} \cdot \text{label}(\text{type}(s)) \cdot \text{titles and explanations of } \mathcal{H}(s))$. Retrieval builds an ordered set $R(s) \subseteq K$ in four steps:
1. $\text{bp}(\beta(s))$ if it is defined.
2. $\bigcup_{j\in H(s)}\Lambda_j$.
3. BM25 results in descending score order, skipping $K_{\text{bp}}\setminus\{\text{bp}(\beta(s))\}$, while $\lvert R\rvert < 11$.
4. K14, K05, K02 in that order while $\lvert R\rvert < 12$.

```ts
function retrieve(s: Seat, H: Hypothesis[], policies: Policy[]): Policy[]
```

---

## 9. Policy argument and memo

**Effects relation.** Let $\text{Dir} = \{+,-,0,\text{mixed}\}$ and $\text{Cert} = \{\text{high},\text{medium},\text{low}\}$.
$$\text{Eff} \subseteq K \times \text{Outcome} \times \text{Dir} \times \text{Cert},\qquad \text{Eff}(k) = \{(o,\delta,\chi) : (k,o,\delta,\chi)\in\text{Eff}\}$$
This is `Policy.effects: PolicyEffect[]`, stored in table `policy_effect`.

**Types** (these match docs/10 `PolicyArgument` exactly):

$$
\begin{aligned}
\text{Claim} &= \langle \texttt{id}, \texttt{kind}\in\{\text{premise},\text{diagnosis},\text{option},\text{ask}\}, \texttt{text}, \texttt{support}\subseteq \text{Id}, \texttt{confidence}^? \rangle\\
\text{Option} &= \langle \texttt{id}, \texttt{lever}, \texttt{holder}\subseteq\text{Holder}, \texttt{policyIds}\subseteq\text{Id}, \texttt{expectedEffects}, \texttt{risk}, \texttt{addresses}\subseteq\texttt{HypId}\rangle\\
\text{Argument} &= \langle \texttt{seat}\in S, \Pi : \text{Claim}^*, \Delta : \text{Claim}^*, \Omega : \text{Option}^*, \texttt{asks} : \{mp, council\}, \texttt{dataGaps} : \text{string}^*\rangle
\end{aligned}
$$

A *premise* $\pi\in\Pi$ is a stated seat fact from `seatFacts`. Its support is the field names it cites. A *diagnosis* claim $\delta\in\Delta$ restates one $h_j$ with $\delta.\texttt{id} = j \in H(s)$ and $\delta.\texttt{confidence} = c_j(s)$.

**Well-formedness** of $A = \text{buildArgument}(s,\text{ctx})$. Write $\text{ids}(\Pi)$ for the premise ids and $\text{ids}(K)$ for the policy ids:

- **WF1** $\forall \delta\in\Delta:\ \texttt{support}(\delta) \subseteq \text{ids}(\Pi)\cup H(s)$ and $\texttt{support}(\delta)\cap\text{ids}(\Pi)\neq\varnothing$. Every diagnosis rests on at least one stated premise; docs/10 states the strict form $\subseteq \text{ids}(\Pi)$.
- **WF2** $\forall o\in\Omega:\ \varnothing \neq \texttt{addresses}(o) \subseteq \{\delta.\texttt{id} : \delta\in\Delta\} \subseteq H(s)$.
- **WF3** $\forall o\in\Omega:\ \texttt{policyIds}(o)\subseteq \text{ids}(K)$ (and in practice $\subseteq R(s)$).
- **WF4** $\texttt{expectedEffects}(o) = \bigcup_{k\in\texttt{policyIds}(o)}\text{Eff}(k)$. Options *aggregate by union*: no effect is invented or netted off, and conflicting directions on one outcome are kept side by side.
- **WF5** $\Delta\neq\varnothing$ (because $\lvert H(s)\rvert\ge1$). $\Omega=\varnothing$ only if $H(s)=\{\texttt{none}\}$.

**Inference-rule view.** A diagnosis is derived from premises by the rule $h_j$. Two examples:

$$
\frac{\pi_a : \texttt{owned}(s)=o \quad \pi_b : \text{bpkP}(s)=P \quad o\ge58 \quad P<0.4}
     {\delta_{\texttt{homeowner}} : \text{``homeowner resistance is holding supply back''}\ \ [c_1(s)]}\ (h_1)
$$

$$
\frac{\pi_a : \texttt{regPer100}(s)=g \quad \pi_b : \texttt{privRent}(s)=p \quad g<75 \quad p\ge30}
     {\delta_{\texttt{cant\_vote}} : \text{``many adults here can't vote on it''}\ \ [\texttt{strong} \text{ if } g<72 \text{ else } \texttt{moderate}]}\ (h_5)
$$

An option is derived from a diagnosis and a policy:
$$\frac{\delta_j\in\Delta \quad k\in\Lambda_j\cap R(s) \quad \text{Eff}(k)\neq\varnothing}{o : \langle \texttt{lever}(k), \texttt{holder}(k), \{k\}, \text{Eff}(k), \ldots, \{j\}\rangle}$$

**Memo.** Let $\text{Sec} = \langle$Bottom line, What the data shows, Diagnosis, Policy context and history, Options, Outlook and implications, Campaign ask, Data gaps$\rangle$ (8 fixed sections, in order). Then
$$\text{memo} : S\times\texttt{Settings}\to\text{Markdown},\qquad \text{memo} = \text{LLM}\circ\text{memoPrompt},\qquad \text{sections}(\text{memo}(s,\sigma)) = \text{Sec}.$$
It is total: in mock mode, $\text{LLM}$ is replaced by the deterministic renderer of $A$. Citation soundness: $\text{cites}(\text{memo}) \subseteq \text{ids}(R(s))$, checked by `validateCitations`, which returns $\text{cites}\setminus\text{ids}(R(s))$ (the result must be $\varnothing$).

```ts
function seatFacts(s: Seat, ctx: Ctx): Record<string, unknown>
function buildArgument(s: Seat, ctx: Ctx): PolicyArgument
function memoPrompt(s: Seat, ctx: Ctx): { prompt: string; docs: Policy[]; argument: PolicyArgument }
function validateCitations(text: string, allowedIds: string[]): { unknown: string[] }
```

---

## 10. Findings (ALG-14)

**Thirds.** For $X\subseteq S$ and a key $k$, sort ascending to $x_{(1)}\le\dots\le x_{(|X|)}$ with $m = \lfloor\lvert X\rvert/3\rfloor$:
$$\text{thirds}(X,k) = \big(\{x_{(1)},\dots,x_{(m)}\},\ \{x_{(|X|-m+1)},\dots,x_{(|X|)}\}\big)$$
The middle is dropped. A finding reports $\overline{y}$ over each third for an outcome $y$, for example $\text{bd} = 1000\,\texttt{homes}/\texttt{dwellings}$.

**Spearman.** With average ranks $\text{rk}$ (ties take their mean rank):
$$\rho(x,y) = \frac{\operatorname{cov}(\text{rk}\,x,\ \text{rk}\,y)}{\sigma_{\text{rk}\,x}\,\sigma_{\text{rk}\,y}}\in[-1,1]$$
This is Pearson on ranks. The shortcut $1 - 6\sum d^2/(n(n^2-1))$ is exact only without ties, so it is not used.

| Finding | Domain | $k$ (split) | $y$ | Sides |
|---|---|---|---|---|
| F1 | $S$ | `wtbPer1k` | bd | market → outcome |
| F2 | $S$ | `owned` | bd | composition → outcome |
| F3 | $S$ | `privRent` | `regPer100` | composition → weight |
| F4 | $S_{\text{meas}}$ ($n=51$) | `owned` | `V` | composition → voter |

```ts
function findings(seats: Seat[]): Finding[]
function spearman(x: number[], y: number[]): number
function thirds<T>(arr: T[], key: (t: T) => number): [T[], T[]]   // (internal) core/src/findings.ts
```
