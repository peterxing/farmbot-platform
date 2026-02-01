import { DEFAULTS } from './config.js';

export function computeVirtualAreaSqm(balance: bigint, totalSupply: bigint): number {
  if (totalSupply <= 0n) return 0;
  const ratio = Number(balance) / Number(totalSupply);
  return ratio * DEFAULTS.farmTotalAreaSqm;
}

export function computeOpsCreditsEntitled(balance: bigint, totalSupply: bigint): number {
  if (totalSupply <= 0n) return 0;
  const ratio = Number(balance) / Number(totalSupply);
  return ratio * DEFAULTS.totalOpsCreditsPerWeek;
}
