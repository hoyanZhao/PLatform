import { context, dual, money } from "./common.js";

export function matchPolicies(input, config) {
  const { industry, a, fx } = context(input, config);
  const official = config.rules.official;
  const result = [
    {
      id: "two-tier",
      title: "利得税两级制备选",
      status: "待核验",
      official: true,
      estimated: null,
      reason: "缺少关联实体、适用主体及选择记录，基础报告不默认享受优惠。",
      conditions: official.hkProfitsTax.condition,
      source: official.hkProfitsTax.source,
    },
  ];
  if (industry.rd) {
    const budget = money(
      input.investmentCny * fx * a.potentialRdBudgetFraction,
    );
    result.push({
      id: "ess",
      title: "ESS 企业支援计划",
      status: "待核验",
      official: true,
      estimated: dual(
        Math.min(official.ess.capHkd, budget * official.ess.matchingRate),
        fx,
      ),
      reason:
        "演示假设：研发合资格预算为投资额 12%，若完全获认可且配对获批，则用官方配对比例计算；未获核准，到账年仅假设为第二年。",
      conditions: official.ess.condition,
      source: official.ess.source,
    });
    result.push({
      id: "rth",
      title: "研究人才库／人才聘用支持",
      status: "待核验",
      official: true,
      estimated: null,
      reason:
        "缺少企业资格、岗位学历、项目类别及资助期限，官方可申领额度无法确定。",
      conditions: "向创新科技署核对类别、资格、受资助岗位和当期上限。",
      source: config.policies.find((p) => p.id === "rth").url,
    });
  }
  result.push({
    id: "park",
    title: "园区扶持与孵化计划",
    status: "待核验",
    official: false,
    estimated: null,
    reason: "没有已确认的入驻或孵化计划资格；不设置虚构园区现金补贴。",
    conditions: "核对具体计划、入驻评审、租约及申请窗口。",
    source: config.parks.find((p) => p.id === input.park).url,
  });
  return result;
}
