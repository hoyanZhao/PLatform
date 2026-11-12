export const esc = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const num = (value) =>
  new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 2 }).format(value);
const money = (value) => `¥${num(value.cny)} / HK$${num(value.hkd)}`;
const list = (values) =>
  `<ul>${values.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`;
const link = (url, label) =>
  `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>`;
const table = (heads, rows) =>
  `<table><thead><tr>${heads.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table>`;

/** 同一模板用于网页预览与 PDF，报告全部由计算结果与固定本地说明生成。 */
export function renderReport(r, config, version = "full", graphs = {}) {
  const title = {
    full: "完整决策版",
    executive: "高管精简摘要版",
    compliance: "法务合规专项版",
  }[version];
  const industry = config.industries.find(
    (x) => x.id === r.input.industry,
  ).name;
  const park = config.parks.find((x) => x.id === r.input.park).name;
  const a = config.rules.assumptions;
  const header = `<header><div class="eyebrow">HK INVEST · 津港交流大赛演示原型</div><h1>企业赴港投资智能评测报告</h1><p>${title} · 报告编号 ${esc(r.id)}</p></header><aside><strong>【项目演示假设 · 非专业投资意见】</strong><p>${esc(r.meta.disclaimer)}</p><p>五个输入字段不足以确认税惠、补贴或签证资格；基础情景已确认补贴为 0。资料缺失不代表已经发现违法，评级不代表盈利保证。</p></aside><h2>一、项目与模型依据</h2>${table(
    ["项目", "内容"],
    [
      ["行业／规模", `${esc(industry)} / ${esc(r.meta.scaleMapping)}`],
      ["计划投资", money(r.profit.investment)],
      [
        "年预估营收",
        money({ cny: r.input.revenueCny, hkd: r.input.revenueCny * r.meta.fx }),
      ],
      ["意向园区", esc(park)],
      [
        "情景",
        `延迟 ${r.scenario.delayYears} 年；目标区域 ${esc(r.overseas.selected?.name ?? "未选择")}`,
      ],
      ["固定汇率", `1 人民币 = ${r.meta.fx} 港币（演示假设）`],
      ["配置快照", esc(r.meta.version)],
      [
        "资料核对／人工核验",
        `${esc(r.meta.sourceCheckedAt)} / ${esc(r.meta.lastHumanVerifiedAt ?? "尚未人工核验")}`,
      ],
      ["配置 SHA-256", `<code>${esc(r.meta.modelHash)}</code>`],
    ],
  )}`;
  const summary = `<h2>二、决策摘要</h2><p>${esc(r.narrative.conclusion)}</p><p>${esc(r.narrative.risk)}</p><p>${esc(r.narrative.landing)}</p>${table(["三年累计净利润", "预算回报率", "综合风险"], [[money(r.profit.cumulativeNet), `${(r.profit.roi * 100).toFixed(1)}%（演示）`, `${r.risk.score}/100 · ${r.risk.level}`]])}`;
  const risk = `<h2>风险体检与整改方案</h2><p>${esc(r.risk.methodology)}</p>${graphs.risk ?? ""}${table(
    ["维度／权重", "评分／等级", "触发原因与整改"],
    r.risk.items.map((i) => [
      `${esc(i.name)} / ${i.weight * 100}%`,
      `${i.score} / ${i.level}`,
      `${list(i.reasons)}<p><strong>整改：</strong>${esc(i.remedy)}</p>${link(i.source, "主管机构入口")}`,
    ]),
  )}<h3>跨境与持续合规核验清单</h3>${list(r.landing.compliance)}`;
  const tasks = `<h2>落地任务时间线</h2><p>以下为建议计划节点，不是法定截止日；真实期限须按注册周年、会计期及主管机关通知另行确认。</p>${table(
    ["阶段与节点", "任务", "执行要点与依据"],
    r.landing.tasks.map((t) => [
      `${esc(t.stage)}<br>${esc(t.offset)}`,
      esc(t.title),
      `${esc(t.details)}<br>${link(t.url, "官方指引")}`,
    ]),
  )}`;
  const profit = `<h2>盈利可行性与三年预测</h2><p>${esc(r.profit.taxBasis)}</p>${graphs.tax ?? ""}<p>内地综合税费包含增值税及附加，香港为利得税，两者税种结构不同。首年综合现金缴税差额：${money(r.profit.years[0].taxDifference)}；仅所得税差额：人民币 ${num(r.profit.years[0].incomeTaxOnlyDifferenceCny)} 元，均不代表可直接实现的跨境节税。</p>${graphs.profit ?? ""}${table(
    [
      "年度",
      "香港营收 CNY / HKD",
      "香港成本与折旧 CNY / HKD",
      "香港利得税 CNY / HKD",
      "净利润 CNY / HKD",
    ],
    r.profit.years.map((y) => [
      `${y.year}`,
      money(y.revenue),
      money({
        cny: y.revenue.cny - y.preTax.cny,
        hkd: y.revenue.hkd - y.preTax.hkd,
      }),
      money(y.hkTax),
      money(y.net),
    ]),
  )}${table(
    [
      "年度",
      "内地 VAT（人民币）",
      "附加（人民币）",
      "所得税（人民币）",
      "综合现金缴税（人民币）",
      "两地综合差额（人民币）",
    ],
    r.profit.years.map((y) => [
      `${y.year}`,
      num(y.mainland.vatCny),
      num(y.mainland.surchargeCny),
      num(y.mainland.citCny),
      num(y.mainland.totalTaxCny),
      num(y.taxDifference.cny),
    ]),
  )}<p>首年注册、年审合规、办公和人工费用合计：${money(r.profit.firstYearOperatingExpense)}；装修预算：${money(r.profit.fitoutBudget)}（三年折旧，非再次扣除全部投资）。累计利润覆盖预算参考：${r.profit.budgetRecoveryYear ? `第 ${r.profit.budgetRecoveryYear} 年` : "三年内未覆盖"}。</p>${list(r.profit.caveats)}`;
  const policy = `<h2>政策红利匹配与备选情景</h2><p>基础盈利不计待核验资助，也不默认两级制资格。下列潜在金额不是承诺获批收入。</p>${table(
    ["政策／状态", "条件、假设与依据", "备选金额"],
    r.policies.map((p) => [
      `${esc(p.title)}<br>${esc(p.status)}`,
      `${esc(p.reason)}<p>${esc(p.conditions)}</p>${link(p.source, "官方原文")}`,
      p.estimated ? money(p.estimated) : "无法确认／待核验",
    ]),
  )}<p>${esc(r.alternative.note)}第二年潜在资助 ${money(r.alternative.potentialGrant)}；资助备选三年利润上界 ${money(r.alternative.threeYearNet)}。${esc(r.alternative.grantTaxNote)}</p><p>三年两级制潜在税差（单列、不与资助合并）：${money(r.alternative.twoTierTaxSavings)}。</p>`;
  const talent = `<h2>人才需求与津港青年资源</h2>${table(
    ["岗位", "建议人数"],
    r.talent.roles.map((x) => [esc(x.name), `${x.count}`]),
  )}<p>${esc(r.talent.note)}盈利模型人工基线采用 ${r.talent.payrollBaseEmployees} 人；首期招聘建议 ${r.talent.total} 人，二者用途不同。</p><p>可申领人才津贴：待核验、无法确认；人才支持预算敏感性假设：${money(r.talent.potentialTalentSupport.simulatedBudget)}。${esc(r.talent.potentialTalentSupport.note)}</p>${list(r.talent.visas)}${list(r.talent.checklist)}<p><strong>【演示模拟数据，非真实企业 / 人才】</strong>以下仅展示能力标签，不含真实候选人。</p>${list(r.talent.resources.map((x) => `${x.name}：${x.tags.join("、")}；${x.description}`))}`;
  const landing = `<h2>最优落地方案（演示推荐）</h2><p>${esc(r.landing.mode)}</p><p>推荐：${esc(r.landing.recommendedPark.name)}。${esc(r.landing.note)}</p>${table(
    ["阶段", "比例", "预算 CNY / HKD", "放款／投入前置条件"],
    r.landing.phases.map((p) => [
      esc(p.name),
      `${Math.round(p.fraction * 100)}%`,
      money(p.amount),
      esc(p.gate),
    ]),
  )}<h3>借港出海反向推演</h3><p>${esc(r.overseas.note)}</p>${table(
    [
      "目标区域",
      "模拟营收增量 CNY / HKD",
      "模拟拓展费用 CNY / HKD",
      "核验说明",
    ],
    r.overseas.ranking.map((x) => [
      esc(x.name),
      money(x.increment),
      money(x.expansionCost),
      esc(x.reason),
    ]),
  )}`;
  const cases = `<h2>津港企业对标参考</h2><p><strong>【演示模拟数据，非真实企业 / 人才】</strong>未提供真实津冀企业盈利或资助记录；缺失指标留空，不作为实际案例成果。</p>${table(
    [
      "模拟企业",
      "投资（人民币）",
      "模拟资助（人民币）",
      "模拟回收月数",
      "经验",
    ],
    config.cases
      .filter((c) => c.industry === r.input.industry)
      .map((c) => [
        esc(c.name),
        num(c.investmentCny),
        c.subsidyCny === null ? "未提供" : num(c.subsidyCny),
        c.paybackMonths === null ? "未提供" : `${c.paybackMonths}`,
        esc(c.lesson),
      ]),
  )}`;
  const assumptions = `<h2>固定参数与计算公式</h2><p>除单列引用的香港利得税规则和 ESS 条件，其余测算系数均为【项目演示假设】。固定汇率不是市场汇率，所有未来收入与成本都不是预测保证。</p>${table(
    ["参数", "值"],
    [
      [
        "行业毛利率／增长率",
        `${config.industries.find((i) => i.id === r.input.industry).grossMargin * 100}% / ${config.industries.find((i) => i.id === r.input.industry).growth * 100}%`,
      ],
      ["人工基线", `HK$${num(a.payrollPerEmployeeHkd)} / 人 / 年`],
      [
        "香港成本年增幅／延迟增幅",
        `${a.hkCostInflation * 100}% / ${a.delayAnnualCostInflation * 100}%`,
      ],
      [
        "注册／年度合规",
        `HK$${num(a.registrationHkd)} / HK$${num(a.annualComplianceHkd)}`,
      ],
      ["装修预算", `投资额 × ${a.fitoutFraction * 100}%，三年直线折旧`],
      [
        "内地人工／办公系数",
        `${a.mainlandPayrollFactor} / ${a.mainlandOfficeFactor}（相对香港换算成本）`,
      ],
      [
        "内地所得税／附加演示口径",
        `${a.mainlandCit * 100}% / 实缴 VAT × ${a.surchargeOnVat * 100}%`,
      ],
      [
        "风险等级",
        `≥${a.riskLevels.high} 高危；≥${a.riskLevels.medium} 中危；其余低危`,
      ],
      [
        "盈利评级",
        `三年 ROI≥${a.profitLevels.highRoi * 100}% 且风险<${a.profitLevels.maximumHighRisk} 为高度盈利；否则 ROI≥${a.profitLevels.steadyRoi * 100}% 且第三年利润>0 为稳健经营；其余谨慎投资`,
      ],
    ],
  )}${list(["第 n 年营收 = 首年营收 × (1 + 行业增长率)^(n−1)；香港营收按固定汇率换算。", "香港税前代理利润 = 营收 × 行业毛利率 − 人工 − 办公 − 合规 − 首年注册 − 装修折旧；标准利得税 = max(代理利润, 0) × 16.5%。", "内地净 VAT = 不含税营收 × 行业演示税率 × (1−演示进项抵扣比例)；附加 = 净 VAT × 12%。", "内地所得税 = max(营收 − 演示经营成本 − 附加, 0) × 25%；综合现金缴税 = VAT + 附加 + 所得税。", "三年预算回报率 = 三年累计净利润 / 计划投资；风险分 = 各分项分数 × 固定权重之和，四舍五入。"])}<details open><summary>完整模型参数快照（演示参数）</summary><pre>${esc(JSON.stringify({ assumptions: config.rules.assumptions, industry: config.industries.find((i) => i.id === r.input.industry), park: config.parks.find((p) => p.id === r.input.park), official: config.rules.official }, null, 2))}</pre></details>`;
  const sources = `<h2>资料来源与版本边界</h2><p>${esc(r.meta.newsDisclaimer)}本报告不读取联网资讯作为模型输入；资讯抓取时间请在网站资讯页查看，不等于人工核验时间。</p>${list(config.policies.map((p) => `${p.publisher}：${p.title}；开发资料核对 ${p.checkedAt ?? "未完成"}`))}${config.policies.map((p) => `<p>${link(p.url, p.title)}</p>`).join("")}<footer>港企投资智能评测平台 · 大赛原型 · ${esc(r.meta.version)} · 请保存重要报告，清除浏览器站点数据将丢失本地档案。</footer>`;
  return (
    header +
    (version === "compliance"
      ? risk + tasks
      : version === "executive"
        ? summary +
          `<h2>决策前提</h2><p>基础情景资助为 0；潜在资助 ${money(r.alternative.potentialGrant)} 仅作待核验备选。园区、人才签证与行业牌照均须另行核验。</p>` +
          list(r.landing.compliance) +
          table(
            ["阶段", "预算 CNY / HKD"],
            r.landing.phases.map((p) => [esc(p.name), money(p.amount)]),
          )
        : summary +
          profit +
          risk +
          policy +
          landing +
          talent +
          cases +
          tasks +
          assumptions) +
    sources
  );
}
