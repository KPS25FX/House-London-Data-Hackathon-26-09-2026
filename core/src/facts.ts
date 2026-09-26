// ALG-10 seat facts JSON for the memo prompt.
import type { Ctx, Seat } from './types.js';
import { TYPES } from './content.js';
import { fmt } from './format.js';

export function seatFacts(r: Seat, ctx: Ctx): Record<string, unknown> {
  const N = ctx.seats.length || 75;
  const b = ctx.boroughs[r.borough];
  return {
    seat: r.name, borough_council: r.borough, mp: r.mp ? `${r.mp} (${r.mpParty})` : (r.mpNote || 'vacant'),
    ge2024: `${r.won} won over ${r.second} by ${fmt(r.majority)} votes (${r.marginPct.toFixed(1)} pts)`, area_type: TYPES[r.type].label,
    unserved_home_seekers_WhereToBuild: r.wtbGap, per_1000_residents: r.wtbPer1k, demand_rank_of_75: Math.round(r.Mp * N),
    resident_housing_concern_pct: +(r.V * 100).toFixed(1), concern_is_estimated: r.vEst, concern_rank_of_75: Math.round(r.Vp * N),
    homes_completed_per_year_Datahub_2019_20_to_2024_25: r.homes, homes_completed_since_2019: r.completed7, existing_dwellings_2025: r.dwellings,
    homes_built_per_1000_existing_per_year: +(r.homes / Math.max(r.dwellings, 1) * 1000).toFixed(1),
    model_should_build_per_year: Math.round(r.target), model_missing_homes_per_year: Math.round(r.gap), model_calibrated_to_london_total: ctx.settings.total,
    pipeline_since_2019: { approved_not_started: r.approvedNS, under_construction: r.startedNC, lapsed: r.lapsed, refused: r.refused },
    brownfield_capacity_homes: r.bf, ptal_mean_access_index: r.ptal, median_price_2026: r.medPrice,
    registered_voters_per_100_adults: r.regPer100, pct_moved_in_last_year: r.movedIn, pct_overcrowded: r.overcrowd, pct_underoccupied_2plus_bedrooms: r.underocc,
    top_missing_neighbourhoods: (r.tops || []).map(x => `${x.n}: ${x.miss} missing/yr, ${x.built} built/yr, brownfield ${x.bf}, PTAL ${x.ptal}`),
    borough_context: b ? {
      housing_delivery_test_2025_pct: Math.round(b.hdt * 100), hdt_consequence: b.hdtCons, major_scheme_approval_rate_since_2019_pct: b.apprRate,
      council_control_2026: b.control, pct_second_homes: b.pctSecond, pct_long_term_empty: b.pctEmpty,
    } : null,
    tenure_pct: { owned: r.owned, owned_outright: r.outright, private_rent: r.privRent, social_rent: r.social },
    price_to_earnings: r.afford, house_price_change_5y_pct: r.hpg5, campaign_priority_0_100: Math.round(r.prio), priority_rank: r.rank,
  };
}
