export const esc = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export const number = (value, digits = 2) =>
  new Intl.NumberFormat("zh-CN", { maximumFractionDigits: digits }).format(
    value,
  );
export const wan = (n) => number(n / 10000);
export const dual = (value) =>
  `¥${wan(value.cny)} 万 <span class="cell-sub">HK$${wan(value.hkd)} 万</span>`;
export const date = (value) =>
  value
    ? new Intl.DateTimeFormat("zh-CN", {
        timeZone: "Asia/Shanghai",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(value))
    : "未提供";
export const dateTime = (value) =>
  value
    ? new Intl.DateTimeFormat("zh-CN", {
        timeZone: "Asia/Shanghai",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(value))
    : "尚无成功抓取";
export const badge = (label, type = "") =>
  `<span class="badge ${type}">${esc(label)}</span>`;
export const riskBadge = (risk) =>
  badge(
    `${risk.level} · ${risk.score}`,
    risk.level === "高危" ? "red" : risk.level === "中危" ? "gold" : "green",
  );
export const link = (url, title = "官方原文") =>
  `<a class="official-link" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(title)} ↗</a>`;
export const table = (heads, rows) =>
  `<div class="table-wrap"><table><thead><tr>${heads.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((x) => `<td>${x}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
export const panelHeading = (title, description = "", action = "") =>
  `<div class="panel-heading"><div><h2>${esc(title)}</h2>${description ? `<p>${esc(description)}</p>` : ""}</div>${action}</div>`;
export const pageHeading = (eyebrow, title, description, action = "") =>
  `<div class="page-heading"><div><span class="eyebrow">${esc(eyebrow)}</span><h1>${esc(title)}</h1><p>${esc(description)}</p></div>${action}</div>`;
export const empty = (title, description, action = "") =>
  `<div class="empty"><div class="empty-symbol">◇</div><h3>${esc(title)}</h3><p>${esc(description)}</p>${action}</div>`;
export const demoWarning = () =>
  `<div class="notice warning"><strong>【项目演示假设数值，不代表真实市场结果，实际经营请另行专业测算】</strong><br>五个输入字段不足以确认税惠、资助或签证资格；基础盈利不计待核验补贴。演示模型不是投资、税务、法律或移民意见。</div>`;
export const mockWarning = () =>
  `<div class="notice warning"><strong>【演示模拟数据，非真实企业 / 人才】</strong>所有模拟案例和标签均用于演示，无真实招聘、资助或盈利成果，不可作为真实素材对外展示。</div>`;
