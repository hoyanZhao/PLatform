import { snapshot } from "./config.js";

export class ValidationError extends Error {
  constructor(fields) {
    super("请检查输入字段");
    this.status = 400;
    this.fields = fields;
  }
}

/** 前后端均校验；后端只接收五个基础字段，不信任客户端传入的费率或分数。 */
export function validateAssessment(body) {
  const errors = {};
  if (!body || typeof body !== "object" || Array.isArray(body))
    throw new ValidationError({ form: "请求格式错误" });
  const allowed = ["industry", "investmentCny", "revenueCny", "park", "scale"];
  if (Object.keys(body).some((k) => !allowed.includes(k)))
    errors.form = "基础表单含未允许字段";
  if (!snapshot.industries.some((x) => x.id === body.industry))
    errors.industry = "请选择有效行业";
  if (!snapshot.parks.some((x) => x.id === body.park))
    errors.park = "请选择有效园区";
  if (!Object.hasOwn(snapshot.rules.assumptions.scale, body.scale))
    errors.scale = "请选择企业规模";
  for (const [key, max] of [
    ["investmentCny", 1e11],
    ["revenueCny", 1e12],
  ]) {
    const n = body[key];
    if (
      typeof n !== "number" ||
      !Number.isFinite(n) ||
      n < (key === "investmentCny" ? 10000 : 0) ||
      n > max ||
      Math.abs(n * 100 - Math.round(n * 100)) > 0.001
    )
      errors[key] =
        `请输入有效人民币金额（${key === "investmentCny" ? "至少 1 万元" : "可为 0"}，最多两位小数）`;
  }
  if (Object.keys(errors).length) throw new ValidationError(errors);
  return Object.fromEntries(allowed.map((k) => [k, body[k]]));
}

export function validateScenario(value = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new ValidationError({ scenario: "情景格式错误" });
  const a = snapshot.rules.assumptions;
  const errors = {};
  if (Object.keys(value).some((k) => !["delayYears", "region"].includes(k)))
    errors.scenario = "情景含未允许字段";
  const delayYears = value.delayYears ?? 0;
  if (!Number.isInteger(delayYears) || delayYears < 0 || delayYears > 5)
    errors.delayYears = "延迟年份须为 0–5 的整数";
  const region = value.region ?? null;
  if (region !== null && !Object.hasOwn(a.overseas, region))
    errors.region = "目标区域无效";
  if (Object.keys(errors).length) throw new ValidationError(errors);
  return { delayYears, region };
}
