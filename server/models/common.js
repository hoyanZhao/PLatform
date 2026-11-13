// 货币统一四舍五入到分；百分比保留四位，所有规则无随机数、无网络依赖。
export const money = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
export const clamp = (n, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
export const sum = (values) => money(values.reduce((a, b) => a + b, 0));
export const dual = (hkd, fx) => ({ hkd: money(hkd), cny: money(hkd / fx) });
export function hkTax(profit, rule, twoTier = false) {
  const base = Math.max(0, profit);
  return money(
    twoTier
      ? Math.min(base, rule.thresholdHkd) * rule.firstTierRate +
          Math.max(0, base - rule.thresholdHkd) * rule.standardRate
      : base * rule.standardRate,
  );
}
export function context(input, config) {
  const industry = config.industries.find((x) => x.id === input.industry);
  const park = config.parks.find((x) => x.id === input.park);
  const a = config.rules.assumptions;
  return { industry, park, a, size: a.scale[input.scale], fx: a.fxHkdPerCny };
}
