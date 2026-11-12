import {
  esc,
  number,
  wan,
  dual,
  date,
  dateTime,
  badge,
  riskBadge,
  link,
  table,
  panelHeading,
  pageHeading,
  empty,
  demoWarning,
  mockWarning,
} from "./ui.js";

// 视图层只展示计算结果，不自行重算税率或风险。所有模型数值来自后端本地快照。
// 动态文本统一使用 esc；只有由本模块构建的受控 HTML 片段可以直接组合。

const begin = `<a class="btn primary" href="#assessment">开始双模型评测 →</a>`;
const renderOptions = (items, selected, name = "name") =>
  items
    .map(
      (x) =>
        `<option value="${esc(x.id)}" ${x.id === selected ? "selected" : ""}>${esc(x[name])}</option>`,
    )
    .join("");
const list = (items) =>
  `<ul>${items.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`;
export function versionStrip(state) {
  const { rules } = state.config;
  return `<div class="version-strip"><span>资讯更新 <b>${dateTime(state.news.lastSuccessAt)}</b></span><span>模型快照 <b>${esc(rules.version)}</b></span><span>人工核验 <b>${rules.lastHumanVerifiedAt ? date(rules.lastHumanVerifiedAt) : "尚未人工核验"}</b></span></div>`;
}
function newsRows(items, count = 3) {
  return items
    .slice(0, count)
    .map(
      (n) =>
        `<a class="news-row" href="${esc(n.url)}" target="_blank" rel="noopener noreferrer">${badge(n.category)}<h3>${esc(n.title)}</h3><div class="news-meta"><span>${esc(n.publisher)}</span><span>${date(n.publishedAt)}</span></div></a>`,
    )
    .join("");
}
function stat(label, value, unit, detail, icon = "◇") {
  return `<div class="stat-card"><div class="stat-label">${esc(label)}<span class="stat-icon">${icon}</span></div><div class="stat-value">${value}<small>${esc(unit)}</small></div><div class="stat-detail">${esc(detail)}</div></div>`;
}

export function home(state) {
  const r = state.data.current;
  return (
    pageHeading(
      "INVESTMENT INTELLIGENCE",
      "让每一步投资，都有据可依",
      "连接香港政策、产业与人才，为企业赴港提供清晰的决策参考。",
      `<a href="#projects" class="btn">我的项目档案 ↗</a>`,
    ) +
    `<section class="hero"><div class="hero-copy"><span class="eyebrow">ONE INPUT · DUAL INTELLIGENCE</span><h2>从投资决策，<br>到<span>落地香港。</span></h2><p>盈利测算 × 风险研判，一次填写，同步分析。<br>将复杂政策转化为看得懂、可执行的企业落地方案。</p><div class="button-row"><a href="#assessment" class="btn gold">开启智能评测 <span>→</span></a><a href="#disclaimer" class="text-btn" style="color:#cfdfeb">了解模型口径 ↗</a></div></div><div class="hero-visual" aria-label="盈利与风险双模型协同"><div class="orbit"></div><div class="model-core"><strong>AI</strong><span>双模型引擎</span></div><div class="model-chip profit"><b>↗</b>盈利可行性</div><div class="model-chip risk"><b>◇</b>风险全维研判</div></div></section>` +
    `<div class="quick-stats">${stat("本地政策文库", state.config.policies.length, "份", "官方指引归档 · 资格独立核验", "▥")}${stat("双模型协同", 2, "个模型", "盈利与风险 · 固定公式并行运算", "⇄")}${stat("专属评测档案", state.data.projects.length, "个", "按当前模拟用户存于浏览器", "▤")}${stat(r ? "最近评测风险" : "风险筛查维度", r ? r.risk.score : 4, r ? "/ 100" : "大维度", r ? `${r.risk.level} · 演示评分` : "合规 · 准入 · 竞争 · 政策", "◇")}</div>` +
    `<div class="grid-main"><section class="panel">${panelHeading("您的赴港投资决策，从这里开始", "一套表单，三份材料，让投资逻辑更加清晰", badge("双模型联动", "green"))}<div class="steps"><div class="step"><span class="step-number">01</span><h3>输入企业信息</h3><p>行业、投资、营收、园区、规模，仅需五项基础信息。</p></div><div class="step"><span class="step-number">02</span><h3>双模型同步运算</h3><p>盈利预测与四维风控并行，政策与人才需求联动。</p></div><div class="step"><span class="step-number">03</span><h3>获得专属落地方案</h3><p>完整、摘要、合规三版报告，支持在线预览与 PDF。</p></div></div><div class="model-bar"><span>固定规则可复现 · 图表可交互 · 资讯与模型严格隔离</span><a class="btn small primary" href="#assessment">${r ? "查看／重新评测" : "立即评测"} →</a></div></section><section class="panel">${panelHeading("政策新视野", "官方资讯，持续关注", `<a class="text-btn" href="#news">全部资讯 ↗</a>`)}${state.news.items.length ? newsRows(state.news.items) : `<div class="empty"><p>官方资讯正在按每日任务更新。暂无成功抓取内容时不展示模拟新闻。</p><a class="official-link" href="#library">先查阅本地政策文库 →</a></div>`}</section></div>` +
    `<div class="resource-cards"><a class="resource-card" href="#scenarios"><span class="resource-icon">⌘</span><div><h3>情景模拟沙盘</h3><p>换园区、调投资，比较多套方案</p></div><span>↗</span></a><a class="resource-card" href="#talent"><span class="resource-icon">♧</span><div><h3>津港青年人才联动</h3><p>从产业需求出发，连接人才能力</p></div><span>↗</span></a><a class="resource-card" href="#cases"><span class="resource-icon">⇄</span><div><h3>津港企业对标</h3><p>在模拟案例中预演落地关键点</p></div><span>↗</span></a></div><div class="bottom-notice">${demoWarning()}${versionStrip(state)}</div>`
  );
}

export function assessment(state) {
  const r = state.data.current,
    v = r?.input ?? {
      industry: "technology",
      investmentCny: 5000000,
      revenueCny: 15000000,
      park: "cyberport",
      scale: "small",
    };
  return (
    pageHeading(
      "DUAL MODEL ASSESSMENT",
      "AI 赴港投资双模型评测",
      "五项信息，一次提交。同时获取盈利可行性、全方位风险体检与落地方案。",
    ) +
    demoWarning() +
    versionStrip(state) +
    `<div class="assessment-layout section-gap"><section class="panel">${panelHeading("企业基础信息", "金额单位：人民币万元；年营收使用不含增值税收入")}<form id="assessment-form" novalidate><div class="form-grid"><div class="full"><label for="industry">行业类型</label><select id="industry" name="industry">${renderOptions(state.config.industries, v.industry)}</select><small class="field-error" data-error="industry" role="alert"></small></div><div><label for="investment">计划投资额</label><div class="input-affix"><input id="investment" name="investment" type="number" min="1" max="10000000" step="0.000001" value="${v.investmentCny / 10000}" inputmode="decimal"><span>万元 / CNY</span></div><small class="field-error" data-error="investmentCny" role="alert"></small></div><div><label for="revenue">年预估营收</label><div class="input-affix"><input id="revenue" name="revenue" type="number" min="0" max="100000000" step="0.000001" value="${v.revenueCny / 10000}" inputmode="decimal"><span>万元 / CNY</span></div><small class="field-error" data-error="revenueCny" role="alert"></small></div><div><label for="park">意向入驻园区</label><select id="park" name="park">${renderOptions(state.config.parks, v.park)}</select><small class="field-error" data-error="park" role="alert"></small></div><div><label for="scale">企业规模</label><select id="scale" name="scale">${Object.entries(
      state.config.rules.assumptions.scale,
    )
      .map(
        ([id, s]) =>
          `<option value="${id}" ${id === v.scale ? "selected" : ""}>${s.label}（${s.range}）</option>`,
      )
      .join(
        "",
      )}</select><small class="field-error" data-error="scale" role="alert"></small></div></div><div class="notice">采用固定演示汇率：1 人民币 = ${state.config.rules.assumptions.fxHkdPerCny} 港币。规模映射为小型 8 人、中型 25 人、大型 80 人。海外区域及延迟落地仅在情景沙盘中设置。</div><div class="form-divider"></div><div class="button-row"><button type="submit" class="btn primary" id="assessment-submit">运行双模型，生成评测报告 →</button><span class="field-help">不上传或保存企业项目档案至服务器</span></div><small class="field-error" data-error="form" role="alert"></small></form></section><aside class="panel">${panelHeading("一次输入，双向研判")}<div class="model-card">${badge("MODEL 01")}<h3>智能盈利测算</h3><p>两地税款情景对比、三年利润预测、三级盈利评级、待核验政策红利。</p></div><div class="model-card">${badge("MODEL 02", "green")}<h3>智能风险研判</h3><p>跨境合规、行业准入、市场竞争、政策环境，0–100 固定加权评分。</p></div><div class="model-card">${badge("INTEGRATED", "gold")}<h3>一份可执行的落地规划</h3><p>园区推荐、用工建议、分阶段投资、合规清单，联动津港青年资源。</p></div><a class="official-link" href="#disclaimer">查看完整参数与局限性 ↗</a></aside></div><div id="assessment-results" class="section-gap" aria-live="polite">${r ? results(state, r) : ""}</div>`
  );
}

export function results(state, r) {
  return (
    `<div class="report-toolbar"><div><h3>企业赴港投资智能评测报告</h3><small class="muted">${esc(r.meta.version)} · ${esc(r.id)} · ${esc(r.profit.rating)}</small></div><div class="button-row"><select id="report-version" aria-label="报告版本"><option value="full">完整决策版</option><option value="executive">高管精简摘要版</option><option value="compliance">法务合规专项版</option></select><button class="btn small" data-action="preview-report">在线预览</button><button class="btn small primary" data-action="download-report">下载 PDF ↓</button><button class="btn small" data-action="save-project">保存项目</button></div></div>` +
    `<div class="quick-stats">${stat("三年累计净利润", wan(r.profit.cumulativeNet.cny), "万元 CNY", `HK$${wan(r.profit.cumulativeNet.hkd)} 万 · 无确认资助`)}${stat("三年预算回报率", (r.profit.roi * 100).toFixed(1), "%", `${r.profit.rating} · 演示固定评级`, "↗")}${stat("综合风险得分", r.risk.score, "/ 100", `${r.risk.level} · 越高风险越高`, "◇")}${stat("第二年确认补贴", 0, "元", "潜在资助独立列入备选情景", "▤")}</div>` +
    `<div class="notice">${esc(r.narrative.conclusion)}<br>${esc(r.narrative.risk)}<br>首年两地综合现金缴税差额 ¥${wan(r.profit.years[0].taxDifference.cny)} 万；内地包含 VAT 与附加，香港为利得税，不能直接视为可实现节税。</div>` +
    `<div class="charts-grid section-gap"><section class="panel">${panelHeading("两地税负情景对比", "首年现金缴税口径；不同税种，不等同于迁港节税额")}<div class="chart" id="tax-chart" role="img" aria-label="内地综合现金缴税与香港利得税柱状对比"></div></section><section class="panel">${panelHeading("三年动态盈利走势", "实线为基础情景；虚线为待核验资助乐观上界")}<div class="chart" id="profit-chart" role="img" aria-label="三年净利润曲线，含资助备选情景"></div></section><section class="panel">${panelHeading("四维风险雷达", "这是风险得分，不是概率或占比；越高风险越高")}<div class="chart radar" id="risk-chart" role="img" aria-label="跨境合规、行业准入、市场竞争与政策环境风险雷达"></div></section></div>` +
    `<section class="panel section-gap">${panelHeading("三年经营测算明细", "双币种展示：人民币 / 港币；所有费用与增长系数均为项目演示假设")}${table(
      [
        "年度",
        "营收 CNY / HKD",
        "人工 CNY / HKD",
        "办公 CNY / HKD",
        "利得税 CNY / HKD",
        "净利润 CNY / HKD",
      ],
      r.profit.years.map((y) => [
        `${y.year}`,
        dual(y.revenue),
        dual(y.payroll),
        dual(y.office),
        dual(y.hkTax),
        dual(y.net),
      ]),
    )}<p class="field-help">${esc(r.profit.scaleMapping)}；${esc(r.profit.taxBasis)}。首年注册等费用 ¥${wan(r.profit.firstYearOperatingExpense.cny)} 万，装修预算 ¥${wan(r.profit.fitoutBudget.cny)} 万按三年折旧。</p><details class="section-gap"><summary>展开税费明细、计算口径与局限性</summary>${table(
      [
        "年度",
        "内地净 VAT / CNY",
        "附加 / CNY",
        "企业所得税 / CNY",
        "综合现金缴税差额 / CNY",
        "仅所得税差额 / CNY",
      ],
      r.profit.years.map((y) => [
        `${y.year}`,
        `¥${number(y.mainland.vatCny)}`,
        `¥${number(y.mainland.surchargeCny)}`,
        `¥${number(y.mainland.citCny)}`,
        `¥${number(y.taxDifference.cny)}`,
        `¥${number(y.incomeTaxOnlyDifferenceCny)}`,
      ]),
    )}${list(r.profit.caveats)}</details></section>` +
    `<div class="split-grid section-gap"><section class="panel">${panelHeading("风险体检与整改优先级", r.risk.methodology)}<div class="risk-list">${r.risk.items
      .slice()
      .sort((a, b) => b.score - a.score)
      .map(
        (i) =>
          `<article class="risk-item"><h3>${esc(i.name)} ${riskBadge(i)}</h3>${list(i.reasons)}<p class="remedy"><strong>整改建议：</strong>${esc(i.remedy)}</p>${link(i.source)}</article>`,
      )
      .join(
        "",
      )}</div></section><section class="panel">${panelHeading("政策匹配与备选收益", "资格待核验，不能将上限或敏感性假设计入基础盈利")}${r.policies.map((p) => `<article class="policy-match"><h3>${esc(p.title)} ${badge(p.status, "gold")}</h3><p>${esc(p.reason)}</p><p>${esc(p.conditions)}</p><strong>${p.estimated ? `潜在金额：¥${wan(p.estimated.cny)} 万 / HK$${wan(p.estimated.hkd)} 万` : "可申领金额无法确认"}</strong><br>${link(p.source)}</article>`).join("")}<div class="notice warning section-gap"><strong>备选情景，不保证获批</strong><br>${esc(r.alternative.note)}<br>资助备选三年利润上界：¥${wan(r.alternative.threeYearNet.cny)} 万 / HK$${wan(r.alternative.threeYearNet.hkd)} 万。<br>${esc(r.alternative.grantTaxNote)}<br>另列三年两级制潜在税差：¥${wan(r.alternative.twoTierTaxSavings.cny)} 万。</div></section></div>` +
    `<section class="panel section-gap">${panelHeading("落地方案与分期投资", r.landing.note)}<div class="notice"><strong>演示推荐 ${esc(r.landing.recommendedPark.name)}</strong><br>${esc(r.landing.mode)}</div>${table(
      ["阶段", "比例", "预算 CNY / HKD", "前置条件"],
      r.landing.phases.map((p) => [
        esc(p.name),
        `${p.fraction * 100}%`,
        dual(p.amount),
        esc(p.gate),
      ]),
    )}<div class="button-row section-gap"><a class="btn small" href="#parks">园区适配详情 ↗</a><a class="btn small" href="#talent">人才用工建议 ↗</a><a class="btn small" href="#scenarios">进入 What-if 沙盘 ↗</a></div></section>` +
    `<section class="panel section-gap">${panelHeading("智能落地任务清单", "任务完成状态仅保存到当前浏览器账号", `<button class="btn small" data-action="export-tasks">导出清单 ↓</button>`)}${tasksView(state, r)}</section><div class="bottom-notice">${demoWarning()}${versionStrip(state)}</div>`
  );
}

export function tasksView(state, r) {
  return `<div class="timeline">${r.landing.tasks
    .map((t) => {
      const checked = state.data.tasks[`${r.id}:${t.id}`];
      return `<article class="timeline-item ${checked ? "task-done" : ""}"><div class="time">${esc(t.stage)} · ${esc(t.offset)}</div><label class="task-title"><input type="checkbox" data-task="${esc(t.id)}" ${checked ? "checked" : ""}><div><h3>${esc(t.title)}</h3><p>${esc(t.details)}</p></div></label>${link(t.url, "官方办理指引")}</article>`;
    })
    .join("")}</div>`;
}

export function news(state) {
  return (
    pageHeading(
      "OFFICIAL POLICY UPDATES",
      "政策资讯",
      "每日一次低频获取官方公开元信息；原文不在本站转载，抓取不改变模型配置。",
    ) +
    `<div class="notice warning">${esc(state.config.rules.newsDisclaimer)}</div>${versionStrip(state)}<div class="source-status"><span>最近尝试：${state.news.lastAttemptAt ? dateTime(state.news.lastAttemptAt) : "尚未执行"}</span><span>下次最早：${state.news.nextAllowedAt ? dateTime(state.news.nextAllowedAt) : "等待启动任务"}</span>${state.news.sources.map((s) => `<span>${esc(s.name)}：${esc(s.status)}${s.error ? `（${esc(s.error)}）` : ""}</span>`).join("")}</div><div class="filter-bar section-gap"><input id="news-search" type="search" placeholder="搜索标题、摘要或发布机构" aria-label="资讯关键词"><select id="news-sort" aria-label="资讯排序"><option value="desc">发布时间：最新优先</option><option value="asc">发布时间：最早优先</option></select></div><div class="category-tabs" id="news-categories">${["全部", "招商资讯", "引才", "财税", "招商园区", "科创补贴"].map((c, i) => `<button type="button" class="${i === 0 ? "active" : ""}" data-news-category="${c}">${c}</button>`).join("")}</div><div id="news-list" class="cards-grid">${newsCards(state.news.items)}</div>`
  );
}
export function newsCards(items) {
  return items.length
    ? items
        .map(
          (n) =>
            `<article class="panel listing-card"><div>${badge(n.category)} ${badge("官方资讯", "green")}</div><h2>${esc(n.title)}</h2><p>${esc(n.summary || "公开列表未提供摘要，请查阅官方原文。")}</p>${link(n.url, "阅读官方原文")}<div class="card-foot"><span>${esc(n.publisher)}</span><span>${n.publishedAt ? date(n.publishedAt) : "发布日期未提供"}</span></div></article>`,
        )
        .join("")
    : `<div class="panel" style="grid-column:1/-1">${empty("暂无匹配资讯", "官方抓取失败时会保留已有缓存；没有缓存时不生成模拟新闻。请查看来源状态或查阅本地政策文库。", `<a class="btn" href="#library">查看政策文库</a>`)}</div>`;
}

export function library(state) {
  return (
    pageHeading(
      "LOCAL POLICY LIBRARY",
      "政策文库",
      "本地维护的官方指引索引；资料核对时间与人工核验时间分别展示。",
    ) +
    versionStrip(state) +
    `<div class="filter-bar section-gap"><input id="library-search" type="search" placeholder="搜索政策名称、关键词或内容" aria-label="文库搜索"><select id="library-category" aria-label="文库分类"><option value="全部">全部分类</option>${[...new Set(state.config.policies.map((p) => p.category))].map((c) => `<option>${esc(c)}</option>`).join("")}</select></div><div class="cards-grid" id="library-list">${policyCards(state.config.policies)}</div><div class="bottom-notice notice warning">文库是官方指引归档索引，未缓存或冒充官方完整文件。请点击原文查看最新完整内容；未确认发布日的条目不填写虚构日期。</div>`
  );
}
export function policyCards(items) {
  return items.length
    ? items
        .map(
          (p) =>
            `<article class="panel listing-card"><div>${badge(p.category)} ${badge("本地快照", "gold")}</div><h2>${esc(p.title)}</h2><p>${esc(p.summary)}</p>${link(p.url)}<div class="card-foot"><span>${esc(p.publisher)}</span><span>资料核对 ${p.checkedAt ? date(p.checkedAt) : "待完成"}</span></div></article>`,
        )
        .join("")
    : empty("没有匹配文档", "请调整关键词或分类。");
}

export function scenarios(state) {
  const r = state.data.current;
  if (!r)
    return (
      pageHeading(
        "WHAT-IF SANDBOX",
        "情景模拟沙盘",
        "比较投资、选址、落地时间与目标海外区域的变化。",
      ) +
      `<section class="panel">${empty("先建立一个基准方案", "完成五项基础表单后，即可增加多个情景，并行比较盈利与风险。", begin)}</section>`
    );
  return (
    pageHeading(
      "WHAT-IF SANDBOX",
      "情景模拟沙盘",
      "复用行业、营收和企业规模，调整投资、园区、落地时间与出海方向。",
      `<button class="btn" data-action="add-scenario">＋ 添加情景</button>`,
    ) +
    demoWarning() +
    `<section class="panel section-gap">${panelHeading("基准方案", `${state.config.industries.find((i) => i.id === r.input.industry).name} · 投资 ¥${wan(r.input.investmentCny)} 万 · 年营收 ¥${wan(r.input.revenueCny)} 万 · ${state.config.parks.find((p) => p.id === r.input.park).name}`)}<form id="scenario-form" novalidate><div id="scenario-rows" class="scenario-rows">${scenarioRow(state, 0)}</div><div class="button-row section-gap"><button class="btn primary" type="submit">并行运行并对比 →</button><span class="field-help">最多 3 个新增情景；延迟仅调整成本与风险假设</span></div><small id="scenario-error" class="field-error" role="alert"></small></form></section><div id="scenario-results" class="section-gap" aria-live="polite">${state.data.scenarios.length ? scenarioResults(state, state.data.scenarios) : ""}</div>`
  );
}
export function scenarioRow(state, index) {
  const r = state.data.current;
  return `<div class="scenario-row" data-scenario-row><div><label for="scenario-invest-${index}">情景投资 / 人民币万元</label><input id="scenario-invest-${index}" name="investment" type="number" min="1" max="10000000" step="0.000001" value="${(r.input.investmentCny / 10000) * (index === 0 ? 0.5 : 1)}" required></div><div><label for="scenario-park-${index}">意向园区</label><select id="scenario-park-${index}" name="park">${renderOptions(state.config.parks, r.input.park)}</select></div><div><label for="scenario-delay-${index}">落地时间</label><select id="scenario-delay-${index}" name="delay"><option value="0">基准时点</option><option value="1">推迟 1 年</option><option value="2">推迟 2 年</option><option value="3">推迟 3 年</option><option value="5">推迟 5 年</option></select></div><div><label for="scenario-region-${index}">目标海外区域（可选）</label><select id="scenario-region-${index}" name="region"><option value="">暂不选择</option>${Object.entries(
    state.config.rules.assumptions.overseas,
  )
    .map(([id, x]) => `<option value="${id}">${esc(x.label)}</option>`)
    .join(
      "",
    )}</select></div><button class="icon-btn" data-action="remove-scenario" type="button" aria-label="删除该情景">×</button></div>`;
}
export function scenarioResults(state, reports) {
  return `<section class="panel">${panelHeading("多情景盈利与风险对比", "所有情景均保持本地模型版本；目标区域的模拟营收不计入基础利润")}<div id="scenario-chart" class="chart" role="img" aria-label="多个情景的三年利润与综合风险对比"></div>${table(
    [
      "方案",
      "投资 CNY",
      "园区／时间",
      "三年利润 CNY / HKD",
      "回报率",
      "风险",
      "操作",
    ],
    reports.map((r, i) => [
      i === 0 ? "基准" : `情景 ${i}`,
      `¥${wan(r.input.investmentCny)} 万`,
      `${esc(state.config.parks.find((p) => p.id === r.input.park).name)}<span class="cell-sub">延迟 ${r.scenario.delayYears} 年</span>`,
      dual(r.profit.cumulativeNet),
      `${(r.profit.roi * 100).toFixed(1)}%`,
      riskBadge(r.risk),
      `<button class="text-btn" data-use-scenario="${i}">查看／导出报告</button>`,
    ]),
  )}</section><section class="panel section-gap">${panelHeading("借港出海反向推演", "模拟增量不是净利润；香港平台不保证订单，以下全部为项目演示假设")}${table(
    [
      "方案／目标区域",
      "模拟营收增量 CNY / HKD",
      "模拟拓展费用 CNY / HKD",
      "说明",
    ],
    reports.flatMap((r, i) => {
      const rows = r.overseas.selected
        ? [r.overseas.selected]
        : r.overseas.ranking.slice(0, 2);
      return rows.map((x) => [
        `${i === 0 ? "基准" : `情景 ${i}`} / ${esc(x.name)}`,
        dual(x.increment),
        dual(x.expansionCost),
        esc(x.reason),
      ]);
    }),
  )}<div class="notice warning section-gap">区域优先顺序基于演示行业标签及固定增长系数，非市场研究结论。延迟情景冻结税制快照，不代表未来政策继续有效。</div></section>`;
}

export function projectAlerts(state, project) {
  if (!project.subscribed) return [];
  const config = state.config,
    input = project.report.input;
  const keywords = {
    technology: /tech|innovation|digital|科创|科技|数字/i,
    manufacturing: /manufactur|industr|工业|製造|制造/i,
    trade: /trade|export|import|贸易|貿易/i,
    professional: /business|professional|service|服务|專業/i,
    finance: /financ|bank|securit|金融|銀行/i,
    biotech: /biotech|health|medic|医疗|生命/i,
  };
  const hits = state.news.items.filter(
    (n) =>
      n.firstSeenAt > project.createdAt &&
      (/tax|talent|visa|税|稅|人才|签证/i.test(n.title + " " + n.summary) ||
        keywords[input.industry].test(n.title + " " + n.summary)),
  );
  const messages = hits
    .slice(0, 5)
    .map((n) => ({
      text: `相关官方公告：${n.title}（未判断对模型的实际影响）`,
      url: n.url,
    }));
  if (project.report.meta.version !== config.rules.version)
    messages.push({
      text: "本地模型已有新版本，请重新评测；原档案计算结果保持原快照。",
    });
  if (Date.now() >= Date.parse(project.reviewAt))
    messages.push({
      text: "已到项目每 30 天复核提醒日（演示计划节点，不是法定期限）。请检查资助窗口、牌照、年审及税务通知。",
    });
  for (const policy of config.policies) {
    if (
      !policy.deadline ||
      !policy.industries.some((x) => x === "all" || x === input.industry)
    )
      continue;
    const days = Math.ceil(
      (Date.parse(policy.deadline) - Date.now()) / 86400000,
    );
    if (days <= 30)
      messages.push({
        text: `${policy.title}：${days < 0 ? "已过快照记录日期" : `距快照到期日 ${days} 天`}，须查原文确认`,
        url: policy.url,
      });
  }
  return messages;
}
export function projects(state) {
  return (
    pageHeading(
      "PROJECTS & POLICY WATCH",
      "项目档案与定向预警",
      "档案、订阅与任务都保存在当前浏览器账号下；不会上传项目档案。",
      begin,
    ) +
    `<div class="notice warning"><strong>清除浏览器站点数据会丢失项目档案，请及时导出 PDF。</strong><br>订阅仅在网站打开时展示站内提醒，不发送邮件、短信或系统推送。政策公告只是资讯，规则变更必须人工核验。</div><div class="stack section-gap">${
      state.data.projects.length
        ? state.data.projects
            .map((p) => {
              const r = p.report,
                alerts = projectAlerts(state, p);
              return `<article class="panel"><div class="project-card"><div>${badge("浏览器本地档案", "green")} ${badge(r.meta.version)}<h3>${esc(p.name)}</h3><p>保存于 ${dateTime(p.createdAt)} · 投资 ¥${wan(r.input.investmentCny)} 万 · 三年净利润 ¥${wan(r.profit.cumulativeNet.cny)} 万 · ${r.risk.level}</p><p>下次复核 ${date(p.reviewAt)}（计划提醒）；法定申报／资助到期日仅采用人工核验条目，当前没有已核验的固定截止日。</p><div class="button-row"><button class="btn small" data-open-project="${p.id}">打开报告</button><button class="btn small" data-review-project="${p.id}">已复核，30 天后提醒</button><button class="btn small danger" data-delete-project="${p.id}">删除档案</button></div></div><label class="switch-label"><input type="checkbox" data-subscribe="${p.id}" ${p.subscribed ? "checked" : ""}>订阅行业相关提醒</label></div>${alerts.length ? `<div class="notice warning section-gap">${alerts.map((a) => `<p>${esc(a.text)} ${a.url ? link(a.url) : ""}</p>`).join("")}</div>` : p.subscribed ? `<p class="field-help section-gap">暂无新增相关提醒。提醒不会改变这份历史报告的模型快照。</p>` : ""}</article>`;
            })
            .join("")
        : `<section class="panel">${empty("还没有保存的项目", "完成评测后点击“保存项目”，即可保存完整结果、订阅行业相关资讯并跟踪落地任务。", begin)}</section>`
    }</div>`
  );
}

export function cases(state) {
  const r = state.data.current,
    matching = r
      ? state.config.cases.filter((c) => c.industry === r.input.industry)
      : state.config.cases;
  return (
    pageHeading(
      "TIANJIN × HONG KONG BENCHMARK",
      "津港企业对标沙盘",
      "用模拟样本对照投入、风险与预算回收路径；不冒充真实落地企业。",
    ) +
    mockWarning() +
    `<section class="panel section-gap">${panelHeading("同类项目指标对标", r ? "已按最近评测行业匹配；模拟资助不代表您的可申领金额" : "完成评测后按行业自动匹配，也可先浏览模拟案例。")}${matching.length ? table(["企业／来源", "投资 CNY", "资助 CNY", "回收周期", "风险经验"], matching.map((c) => [`${esc(c.name)}<span class="cell-sub">${esc(c.origin)} · 演示模拟</span>`, `¥${wan(c.investmentCny)} 万`, c.subsidyCny === null ? "— 未提供" : `¥${wan(c.subsidyCny)} 万`, c.paybackMonths === null ? "— 未提供" : `${c.paybackMonths} 个月（模拟）`, `${list(c.risks)}${esc(c.lesson)}`]).concat(r ? [[`您的模型方案`, `¥${wan(r.input.investmentCny)} 万`, "已确认 0；潜在待核验", r.profit.budgetRecoveryYear ? `${r.profit.budgetRecoveryYear} 年（按预算演示）` : "三年内未覆盖预算", esc(r.narrative.risk)]] : [])) : empty("本地暂无同业模拟样本", "不使用其他行业数据冒充同业，也不补填真实企业未披露的资助与盈利。")}<div class="button-row section-gap">${r ? '<button class="btn small" data-action="all-cases">查看全部模拟案例</button>' : begin}</div></section><section class="panel section-gap">${panelHeading("官方公开投资资料入口", "仅提供公开入口，不据此宣称存在已核验的津冀企业盈利数据")}<p class="muted">当前没有已授权、可核验的津冀企业经营案例原始资料。真实企业投资额、资助与盈利周期均不在此编造。</p>${link("https://www.investhk.gov.hk/en/success-stories/", "投资推广署公开企业故事入口")}</section>`
  );
}

export function parks(state) {
  const r = state.data.current,
    parks = r ? r.landing.ranking : state.config.parks;
  return (
    pageHeading(
      "LOCATION INTELLIGENCE",
      "落地园区与商务选址",
      "根据产业标签、演示成本与竞争指标给出推荐；实际入驻需向园区核验。",
    ) +
    demoWarning() +
    `<div class="cards-grid section-gap">${parks.map((p, i) => `<article class="panel listing-card"><div>${badge(r && i === 0 ? "模型优先推荐" : "官方园区／区域入口", r && i === 0 ? "green" : "")} ${r ? badge(`适配 ${p.suitability}/100`, "gold") : ""}</div><h2>${esc(p.name)}</h2><p>${esc(p.area)}</p><p>${esc(p.description)}</p><div><h3>HK$${wan(p.officeAnnualHkd)} 万 / 年</h3><p>基础办公演示假设，按规模放大；非官方报价</p></div><div class="tags">${p.industries.map((id) => `<span class="tag">${esc(state.config.industries.find((i) => i.id === id).name.split(" / ")[0])}</span>`).join("")}</div>${link(p.url, "前往官方入口")}<div class="card-foot"><span>演示密度 ${p.density}/100</span><span>补贴与资格：待核验</span></div></article>`).join("")}</div>`
  );
}

export function talent(state) {
  const r = state.data.current;
  return (
    pageHeading(
      "YOUTH & ENTERPRISE CONNECTION",
      "津港青年人才联动",
      "把企业投资需求转化为岗位与能力标签，让招商与引才协同。",
    ) +
    mockWarning() +
    (r
      ? `<div class="split-grid section-gap"><section class="panel">${panelHeading("企业用工清单", "全部为项目演示假设，不代表实际用工需求")}${table(
          ["岗位职责", "首期建议人数"],
          r.talent.roles.map((x) => [esc(x.name), `${x.count}`]),
        )}<p class="field-help">${esc(r.talent.note)}</p><div class="notice section-gap">首期岗位建议 ${r.talent.total} 人；盈利模型按 ${r.talent.payrollBaseEmployees} 人完整规模基线测算。二者用途不同，请实际核对招聘计划后另行测算。</div></section><section class="panel">${panelHeading("人才支持与签证自查", "高才通、优才、科技人才均有独立资格要求")}<p class="muted">可申领人才津贴：<strong>待核验／无法确认</strong></p><p class="field-help">人才支持预算敏感性假设：¥${wan(r.talent.potentialTalentSupport.simulatedBudget.cny)} 万 / HK$${wan(r.talent.potentialTalentSupport.simulatedBudget.hkd)} 万。${esc(r.talent.potentialTalentSupport.note)}</p><details class="section-gap" open><summary>签证与资格办理前置清单</summary>${list(r.talent.visas)}${list(r.talent.checklist)}</details></section></div>`
      : `<section class="panel section-gap">${empty("先评测，再匹配人才需求", "完成投资表单后，系统将按行业、规模和投资预算自动生成技术、商务及合规职责岗位建议。", begin)}</section>`) +
    `<div class="cards-grid section-gap">${(r ? r.talent.resources : state.config.resources).map((x) => `<article class="panel listing-card"><div>${badge("演示模拟标签", "gold")}</div><h2>${esc(x.name)}</h2><p>${esc(x.description)}</p><div class="tags">${x.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</div><div class="card-foot"><span>无真实个人资料</span><span>无招聘或到岗承诺</span></div></article>`).join("")}</div><section class="panel section-gap">${panelHeading("官方人才政策入口")}<div class="button-row">${state.config.policies
      .filter((p) => ["ttps", "qmas", "techtas", "rth"].includes(p.id))
      .map((p) => link(p.url, p.title))
      .join("")}</div></section>`
  );
}

export function assistant(state) {
  return (
    pageHeading(
      "LOCAL KNOWLEDGE ASSISTANT",
      "AI 政策问答助手",
      "使用本地政策检索与模板回答，不联网生成政策，不判断实际获批资格。",
    ) +
    `<section class="panel chat-layout"><div class="notice warning">原型中的“AI”指固定规则研判和本地检索，不调用外部大模型。答案只引用内置知识库；没有依据时明确说明资料不足。</div><div class="sample-questions"><button data-question="我的企业能申请 ESS 科创补贴吗？">我的企业能申请科创补贴吗？</button><button data-question="高才通是否适合我公司的员工？">高才通适合我的员工吗？</button><button data-question="利得税两级制和离岸免税有什么条件？">利得税有哪些资格条件？</button></div><div id="chat-messages" aria-live="polite"><div class="chat-message"><strong>政策助手 · 本地知识库</strong>您可以询问利得税、公司年审、跨境资金、科创资助与人才签证。我会给出已有依据与官方入口，并说明需要核验的条件。</div></div><form id="question-form" class="chat-input"><label for="question" class="visually-hidden" hidden>政策问题</label><input id="question" maxlength="500" placeholder="输入政策、资助或签证问题（最多 500 字）" aria-label="输入政策问题" required><button class="btn primary" type="submit">发送问题 →</button></form></section>${versionStrip(state)}`
  );
}

export function consultation(state) {
  return (
    pageHeading(
      "TIANJIN–HONG KONG CONTACT",
      "津港交流咨询入口",
      "仅用于展示本地表单流程，不发送邮件、消息或网络咨询请求。",
    ) +
    `<div class="split-grid"><section class="panel">${panelHeading("留下您的咨询意向", "所有内容仅保存在当前浏览器模拟账号下")}<form id="consultation-form" novalidate><div class="form-grid"><div><label for="contact-name">称呼</label><input id="contact-name" name="name" maxlength="40" required placeholder="请使用演示称呼"></div><div><label for="contact-company">企业名称（可选）</label><input id="contact-company" name="company" maxlength="80" placeholder="请勿填写敏感资料"></div><div class="full"><label for="contact-email">联系邮箱（可选）</label><input id="contact-email" name="email" type="email" maxlength="100" placeholder="仅本地保存，不发送邮件"></div><div class="full"><label for="contact-message">咨询内容</label><textarea id="contact-message" name="message" rows="5" minlength="5" maxlength="1000" placeholder="请简要描述希望了解的事项" required></textarea></div></div><small id="consultation-error" class="field-error" role="alert"></small><button class="btn primary" type="submit">保存本地咨询记录</button></form></section><section class="panel">${badge("演示联系邮箱", "gold")}<h2 class="section-gap">连接津港，共创机会</h2><p class="consult-email">demo@jin-hk.example</p><p class="muted">保留域名演示邮箱，不是真实服务邮箱，不提供邮件发送功能。</p><div class="notice warning section-gap">无客服接单，无后台咨询记录。清除站点数据后，咨询记录将随本地档案一起丢失。</div><h3 class="section-gap">本地咨询记录（${state.data.consultations.length}）</h3><div class="stack section-gap">${state.data.consultations.length ? state.data.consultations.map((x) => `<div><small class="muted">${dateTime(x.createdAt)} · ${esc(x.name)}</small><p>${esc(x.message)}</p><button class="text-btn" data-delete-consultation="${x.id}">删除记录</button></div>`).join("") : '<p class="muted">暂无本地咨询记录。</p>'}</div></section></div>`
  );
}

export function disclaimer(state) {
  const config = state.config;
  return (
    pageHeading(
      "METHODOLOGY & DISCLOSURE",
      "模型口径、数据来源与免责声明",
      "资讯自动更新与模型人工维护分开运行，确保演示运算稳定且可追溯。",
    ) +
    demoWarning() +
    versionStrip(state) +
    `<section class="panel legal-body section-gap"><h2>资讯与评测严格隔离</h2><p>${esc(config.rules.newsDisclaimer)}后端新闻任务仅写 storage/news-cache.json，模型只读取 data 中的本地配置，不导入新闻服务或缓存。每日最多一轮，先检查 robots，按站点要求及至少 2.5 秒间隔请求，失败保留旧缓存。</p><h2>人工核验与政策时效</h2><p>当前人工核验时间：${esc(config.rules.lastHumanVerifiedAt ?? "尚未人工核验")}。开发资料核对不等于专业人工审定。香港税制的豁免、两级制资格、内地出口退税、混合销售、跨境抵免及人才计划资格不能由五个字段确认。</p><h2>固定公式与税费口径</h2>${list(["营收按不含增值税收入；行业毛利率扣直接采购、未扣人工办公。营收按固定行业增长率计算。", "香港利润代理值 = 营收 × 演示毛利率 − 人工 − 办公 − 合规 − 注册 − 装修折旧；负利润不征模型利得税，基础按标准公司税率 16.5%。", "两级制仅作资格待核验备选：首 200 万港币应评税利润按 8.25%，其余 16.5%；不自动应用离岸免税或其他豁免。", "京津冀一般工商业演示口径：净 VAT = 不含税营收 × 行业演示税率 × (1−进项抵扣比例)；附加为净 VAT 的 12%；所得税为正税前利润的 25%。非逐企业税法意见。", "内地 VAT 为现金缴税口径，不重复从会计利润扣除；综合现金缴税差额与仅所得税差额分别展示，不能宣称赴港自动免除内地税务义务。", "首年装修按预算 4% 配置并三年折旧；计划投资是预算和 ROI 分母，不再次整笔扣利润。第二年确认补贴为 0；第三年按固定增长率测算。", "风险权重：合规 30%、准入 25%、竞争 25%、政策 20%；≥65 高危、≥35 中危、其余低危。资料缺失只触发核验提醒，不认定违法。", "人才：规模映射 8 / 25 / 80 人；投资 30% 的招聘预算参考，按行业固定岗位比例分配；人才支持预算是假设，不能声称可申领。", "出海：区域固定增长系数 × 行业匹配系数；营收增量不是利润，单列显示，不并入基础三年净利润。"])}<h2>数据及账号边界</h2><p>纯前端模拟账号，密码加盐 SHA-256 后保存在浏览器，无真实服务端认证。每个账号有独立的本地数据命名空间，仍不具备生产系统安全边界。咨询不发送网络请求。案例与人才标签均醒目标注为模拟，缺失指标不补造。</p><h2>完整本地参数快照</h2><details><summary>展开官方规则与全部演示参数</summary><pre class="assumption-block">${esc(JSON.stringify(config.rules, null, 2))}</pre></details><details class="section-gap"><summary>展开行业、园区与规模参数</summary><pre class="assumption-block">${esc(JSON.stringify({ industries: config.industries, parks: config.parks }, null, 2))}</pre></details><h2>官方依据入口</h2>${config.policies.map((p) => `<p>${link(p.url, p.title)} <span class="muted">${esc(p.publisher)} · 资料核对 ${p.checkedAt ? date(p.checkedAt) : "待完成"}</span></p>`).join("")}</section>`
  );
}

export const views = {
  home,
  assessment,
  scenarios,
  projects,
  news,
  library,
  cases,
  parks,
  talent,
  assistant,
  consultation,
  disclaimer,
};
