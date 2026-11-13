import { context, dual, money } from "./common.js";

export function landingModel(input, config, profit, risk, scenario) {
  const { industry, a } = context(input, config);
  const parks = config.parks
    .map((p) => ({
      ...p,
      suitability: Math.round(
        (p.industries.includes(input.industry) ? 60 : 15) +
          (100 - p.density) * 0.2 +
          (1 - p.officeAnnualHkd / 500000) * 20,
      ),
      reason: `${p.industries.includes(input.industry) ? "行业标签匹配" : "行业标签需额外核验"}；成本与竞争评分均基于项目演示参数`,
    }))
    .sort((x, y) => y.suitability - x.suitability || x.id.localeCompare(y.id));
  const high = risk.score >= a.riskLevels.high;
  const phases = high ? [0.15, 0.35, 0.5] : [0.25, 0.35, 0.4];
  const phaseNames = [
    "资质核验与小规模验证",
    "注册、开户与试运营",
    "经营复盘与条件成熟后扩展",
  ];
  const phaseAmounts = phases.map((f) => money(input.investmentCny * f));
  phaseAmounts[2] = money(
    input.investmentCny - phaseAmounts[0] - phaseAmounts[1],
  );
  const tasks = [
    {
      id: "due",
      stage: "准备期",
      offset: "落地前 8–12 周（计划建议）",
      title: "明确业务、跨境投资与资金路径",
      details: "核对行业准入、ODI 和银行材料，完成双币预算与资金来源证明。",
      url: "https://www.safe.gov.cn/",
    },
    {
      id: "company",
      stage: "设立期",
      offset: "落地前 4–8 周（计划建议）",
      title: "公司注册及商业登记",
      details:
        "核对名称、章程、董事、公司秘书、注册地址及重要控制人登记等义务。",
      url: "https://www.cr.gov.hk/",
    },
    {
      id: "bank",
      stage: "设立期",
      offset: "注册后按银行审核安排",
      title: "银行开户与客户尽调",
      details: "准备股权结构、业务计划、合同及资金来源，开户时间不作保证。",
      url: "https://www.hkma.gov.hk/eng/smart-consumers/account-opening/",
    },
    {
      id: "licence",
      stage: "经营前",
      offset: "受规管业务开始前",
      title: "核验与申请牌照",
      details: industry.license,
      url:
        industry.id === "finance"
          ? "https://www.sfc.hk/"
          : "https://www.gov.hk/en/business/",
    },
    {
      id: "hire",
      stage: "运营期",
      offset: "人员到岗前",
      title: "用工与人才签证自查",
      details:
        "核验雇佣条件、签证、强积金及适用人才计划；不把标签匹配等同于获批。",
      url: "https://www.immd.gov.hk/",
    },
    {
      id: "grant",
      stage: "运营期",
      offset: "支出承诺前核验计划要求",
      title: "资助申请与独立账目",
      details: "核实申请窗口、先申请后支出要求、配对资金及禁止重复资助条款。",
      url: "https://www.itf.gov.hk/",
    },
    {
      id: "annual",
      stage: "持续责任",
      offset: "按注册周年及法定期限另行确认",
      title: "周年申报与商业登记续期",
      details:
        "为周年申报、秘书服务、商业登记续期分别设提醒；本表不是法定截止日通知。",
      url: "https://www.cr.gov.hk/",
    },
    {
      id: "tax",
      stage: "持续责任",
      offset: "按税务局通知及会计结算期",
      title: "审计、报税与暂缴税安排",
      details: "保留业务记录，核对利润来源、税务申报及主管机关实际期限。",
      url: "https://www.ird.gov.hk/",
    },
  ];
  return {
    recommendedPark: parks[0],
    ranking: parks,
    mode:
      input.industry === "manufacturing"
        ? "先设商务与研发协作点，生产场地经用途及许可核验后分步建设"
        : "香港实际经营主体配合内地团队，按交易实质明确合同、人员与关联交易职责",
    compliance: risk.items
      .slice()
      .sort((x, y) => y.score - x.score)
      .map((x) => `${x.name}：${x.remedy}`),
    phases: phases.map((fraction, n) => ({
      name: phaseNames[n],
      fraction,
      amount: {
        cny: phaseAmounts[n],
        hkd: money(phaseAmounts[n] * a.fxHkdPerCny),
      },
      gate:
        n === 0
          ? "取得资质与资金路径核验记录"
          : n === 1
            ? "完成注册、开户及必要牌照后试运营"
            : "客户验证、回款与合规复核通过后再扩张",
    })),
    tasks,
    landingDelay: scenario.delayYears,
    note: "推荐基于演示标签、成本与密度，不代表官方评审结果；分期比例为预算安排，不重复计入模型费用。",
  };
}

export function overseasModel(input, config, scenario) {
  const a = config.rules.assumptions;
  const results = Object.entries(a.overseas)
    .map(([id, region]) => {
      const fit = region.suitability.includes(input.industry);
      const growth = region.growth * (fit ? 1 : 0.65);
      const incrementCny = money(input.revenueCny * growth);
      return {
        id,
        name: region.label,
        fit,
        growth,
        increment: dual(incrementCny * a.fxHkdPerCny, a.fxHkdPerCny),
        expansionCost: dual(
          incrementCny * region.costRatio * a.fxHkdPerCny,
          a.fxHkdPerCny,
        ),
        reason: `${fit ? "演示行业标签匹配" : "演示行业标签较弱"}；需另核实目标市场牌照、制裁、关税、数据与产品准入。`,
      };
    })
    .sort(
      (x, y) => y.increment.cny - x.increment.cny || x.id.localeCompare(y.id),
    );
  return {
    selectedRegion: scenario.region,
    selected: results.find((x) => x.id === scenario.region) ?? null,
    ranking: results,
    note: "区域增长和拓展成本均为项目演示假设，营收增量不是净利润，不自动加入基础三年盈利；香港平台不保证订单或免除目标市场监管。",
  };
}
