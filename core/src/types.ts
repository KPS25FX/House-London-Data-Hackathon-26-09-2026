// Shared types. Mirrors docs/10_interfaces.md exactly.

export type Side = 'market' | 'voter' | 'voter_composition' | 'voter_weight' | 'exposure' | 'outcome' | 'identity';
export type AreaType = 'locked' | 'ready' | 'worried' | 'settled' | 'middle';
export type Tier = 0 | 1 | 2;
export type Confidence = 'strong' | 'moderate' | 'tentative';
export type BlockerCat = 'politics' | 'stalled' | 'capacity' | 'land' | 'afford' | 'voice' | 'concentrated' | 'none';
export type MissingMode = 'msoa' | 'seat';
export type HypId =
  | 'homeowner' | 'stalled' | 'council_no' | 'brownfield' | 'cant_vote' | 'high_demand_unbuilt' | 'capacity'
  | 'concentrated' | 'local_afford' | 'social' | 'renters_decide' | 'exposed' | 'green_belt' | 'none';

export interface Settings { total: number; wClose: number; missingMode: MissingMode }
export const DEFAULT_SETTINGS: Settings = { total: 55800, wClose: 0.5, missingMode: 'msoa' };

export interface TopNeighbourhood { n: string; miss: number; built: number; bf: number; ptal: number }

export interface SeatRow {
  code: string; name: string; borough: string; boroughs: string;
  q: number; r: number; pop: number; adults: number; households: number; dwellings: number;
  wtbGap: number; wtbPer1k: number; wtbPerKm2: number; wtbFlag: number;
  afford: number; affEst: boolean; medPrice: number; hpg5: number;
  V: number; vEst: boolean;
  owned: number; outright: number; privRent: number; social: number;
  movedIn: number; underocc: number; overcrowd: number; regPer100: number;
  won: string; second: string; majority: number; marginPct: number; turnout: number;
  mp: string | null; mpParty: string | null; mpNote?: string | null;
  homes: number; completed7: number; approvedNS: number; startedNC: number; lapsed: number; refused: number;
  pipeline: number; bf: number; ptal: number; raw: number; tops: TopNeighbourhood[];
}

export interface Derived {
  Mp: number; Vp: number; Mt: Tier; Vt: Tier; type: AreaType; target: number; gap: number;
  bpd: number; swing: number; close: number; dP: number; prioRaw: number; prio: number; rank: number; bpk: number; bpkP: number;
}
export type Seat = SeatRow & Derived;

export interface Borough {
  lad: string; name: string; hdt: number; hdtCons: string; netAdd6: number; netAdd2425: number; pldVsNet: number;
  apprRate: number | null; inTime: number | null; approved: number; approvedNS: number; startedNC: number; lapsed: number;
  refused: number; pctSecond: number; pctEmpty: number; secondHomes: number; emptyLT: number;
  control: string | null; largest: string | null; seats: number | null;
  underocc: number; overcrowd: number; privRent: number; owned: number; bf: number;
}

export interface Msoa { code: string; name: string; pcon: string; lad: string; dwellings: number; built: number; ptal: number; bf: number; raw: number }

export interface PolicyEffect { outcome: string; direction: '+' | '-' | '0' | 'mixed'; certainty: 'high' | 'medium' | 'low'; note: string; who?: string }

export interface Policy {
  id: string; title: string; tags: string[]; text: string; src: { name: string; url: string }[];
  kind: 'library' | 'borough_profile' | 'evaluation';
  lever?: string; holder?: string[]; scope?: string;
  evidence?: { scale: 'SMS' | 'GRADE' | 'none'; score?: string };
  effects?: PolicyEffect[];
}

export type Postcodes = Record<string, { d: string | null; x?: Record<string, string> }>;

export interface Indicator { key: string; label: string; side: Side; unit: string; source: string; forestKey?: string }

export interface Meta {
  version: string; generatedAt: string; target: number;
  vModel: { r2: number; n: number; mae: number };
  wtbTotal: number;
  model: { coef: number[]; q: number; elasticity: number; median_gap_per1k: number };
  missingMode: 'msoa_exact' | 'msoa_fallback';
  notes: string[];
}

export interface Ctx { seats: Seat[]; boroughs: Record<string, Borough>; policies: Policy[]; settings: Settings; meta: Meta }

export interface Hypothesis { id: HypId; t: string; c: Confidence; s: number; p: string; ev: string; test: string; k: string[] }

export interface Finding {
  id: 1 | 2 | 3 | 4;
  headline: string;   // bold sentence
  a: number; b: number; // compared values (top third vs bottom third)
  cmp: string;        // formatted "a vs b"
  detail: string;     // measure description
  so: string;         // "So what" text (without the prefix)
  rho: number;        // Spearman rank correlation
  rhoText: string;
  n: number;          // seats used
}

export interface Claim { id: string; kind: 'premise' | 'diagnosis' | 'option' | 'ask'; text: string; support: string[]; confidence?: Confidence }
export interface Option { id: string; lever: string; holder: string[]; policyIds: string[]; expectedEffects: PolicyEffect[]; risk: string; addresses: HypId[] }
export interface PolicyArgument { seat: string; premises: Claim[]; diagnosis: Claim[]; options: Option[]; asks: { mp: string; council: string }; dataGaps: string[] }
