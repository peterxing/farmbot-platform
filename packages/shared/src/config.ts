export const DEFAULTS = {
  farmTotalAreaSqm: Number(process.env.FARM_TOTAL_AREA_SQM ?? 242800),
  tokensPerSqm: Number(process.env.TOKENS_PER_SQM ?? 1000),
  totalOpsCreditsPerWeek: Number(process.env.TOTAL_OPS_CREDITS_PER_WEEK ?? 10000)
};

export function computeMaxSupplyTokens(): bigint {
  // integer tokens
  return BigInt(Math.round(DEFAULTS.farmTotalAreaSqm * DEFAULTS.tokensPerSqm));
}
