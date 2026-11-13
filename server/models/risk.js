import { context, clamp } from "./common.js";

export function riskLevel(score, limits) {
  return score >= limits.high
    ? "高危"
    : score >= limits.medium
      ? "中危"
      : "低危";
}
export function riskModel(input, config, scenario) {
  const { industry: i, park, a, size, fx } = context(input, config);
  const payrollCny = (size.employees * a.payrollPerEmployeeHkd) / fx;
  const bufferShort = input.investmentCny < payrollCny;
  const mismatched = !park.industries.includes(i.id);
  const items = [
    {
      id: "compliance",
      name: "跨境合规",
      score: clamp(
        38 +
          (input.investmentCny >= 10000000 ? 12 : 0) +
          (bufferShort ? 15 : 0),
      ),
      reasons: [
        "五字段无法确认 ODI、外汇登记、资金来源、税收居民身份与关联交易安排",
        ...(bufferShort ? ["投资预算不足模型一年人工成本，资金缓冲偏低"] : []),
      ],
      remedy:
        "核对发改、商务、外汇及银行办理要求；建立交易实质与关联交易档案，分别安排周年申报、审计及报税。",
      source: "https://www.safe.gov.cn/",
    },
    {
      id: "access",
      name: "行业准入",
      score: clamp(i.accessRisk + (mismatched ? 10 : 0)),
      reasons: [
        i.license,
        ...(mismatched
          ? ["意向园区与行业演示标签不一致，须确认用途与准入"]
          : []),
      ],
      remedy:
        "先制作实际业务活动清单，再向主管机关核对牌照、人员资格及场地用途；获批前不开展受规管业务。",
      source:
        i.id === "finance"
          ? "https://www.sfc.hk/"
          : "https://www.gov.hk/en/business/",
    },
    {
      id: "market",
      name: "市场竞争",
      score: clamp(
        Math.round(
          i.saturation * 0.6 + park.density * 0.4 + (bufferShort ? 10 : 0),
        ),
      ),
      reasons: [
        `行业饱和度 ${i.saturation}/100、园区密度 ${park.density}/100，均为演示评分，非调查统计`,
        "未采集真实客户订单、竞品价格及市场份额",
      ],
      remedy:
        "先验证付费客户与渠道，以小额试运营、季度复盘和回款里程碑控制投入。",
      source: park.url,
    },
    {
      id: "policy",
      name: "政策环境",
      score: clamp(
        35 +
          scenario.delayYears * 5 +
          (i.rd ? 8 : 0) +
          (!config.rules.lastHumanVerifiedAt ? 10 : 0),
      ),
      reasons: [
        "模型快照尚待专业人工核验；资讯变动不会自动同步模型",
        ...(scenario.delayYears
          ? [
              `延迟 ${scenario.delayYears} 年导致规则时效不确定性增加（演示权重）`,
            ]
          : []),
      ],
      remedy:
        "落地、报税和申报资助前重新查看官方原文；由维护人员核验后手动升级本地快照，预留政策变化缓冲。",
      source: "https://www.investhk.gov.hk/",
    },
  ];
  for (const item of items) {
    item.weight = a.riskWeights[item.id];
    item.level = riskLevel(item.score, a.riskLevels);
  }
  const score = Math.round(
    items.reduce((n, item) => n + item.score * item.weight, 0),
  );
  return {
    score,
    level: riskLevel(score, a.riskLevels),
    items,
    methodology:
      "固定演示评分：0–100，越高风险越高；综合分为分项加权并四舍五入。资料缺失不是已发现违法事实，低分也不代表合规确认。",
    thresholds: a.riskLevels,
  };
}
