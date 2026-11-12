import { api } from "./api.js";
import { authenticate, currentUser, logout } from "./auth.js";
import { loadUser, saveUser, defaultUserData } from "./storage.js";
import { chartOptions, scenarioOption } from "./charts.js";
import {
  views,
  results,
  scenarioRow,
  newsCards,
  policyCards,
  projectAlerts,
} from "./views.js";
import { esc, empty, dateTime } from "./ui.js";

const $ = (selector) => document.querySelector(selector);
// data 只属于当前模拟账号；服务器仅接收临时测算参数，不持久化项目。
const state = {
  user: null,
  data: defaultUserData(),
  config: null,
  news: { items: [], sources: [] },
  route: "home",
  authMode: "login",
  busy: false,
};
let charts = [],
  toastTimer,
  sessionEpoch = 0,
  scenarioSerial = 1,
  newsCategory = "全部";
// sessionEpoch 在退出/换号时递增，丢弃旧账号的异步请求结果。
const titles = {
  home: "平台概览",
  assessment: "AI 双模型评测",
  scenarios: "情景模拟沙盘",
  projects: "项目档案与预警",
  news: "政策资讯",
  library: "政策文库",
  cases: "津港案例对标",
  parks: "落地园区推荐",
  talent: "青年人才联动",
  assistant: "政策问答助手",
  consultation: "津港交流咨询",
  disclaimer: "模型口径与免责声明",
};

function toast(message) {
  clearTimeout(toastTimer);
  $("#toast").textContent = message;
  $("#toast").hidden = false;
  toastTimer = setTimeout(() => ($("#toast").hidden = true), 5500);
}
function persist() {
  saveUser(state.user.id, state.data);
}
function disposeCharts() {
  charts.forEach((c) => c.dispose());
  charts = [];
}
function drawCharts() {
  // 离开页面或更换主题先释放实例，避免重复监听和画布泄漏。
  disposeCharts();
  if (!window.echarts) return;
  const dark = document.documentElement.dataset.theme === "dark";
  function draw(id, option) {
    const el = document.getElementById(id);
    if (el) {
      const c = window.echarts.init(el, null, { renderer: "svg" });
      c.setOption(option);
      charts.push(c);
    }
  }
  if (state.route === "assessment" && state.data.current) {
    for (const [id, option] of Object.entries(
      chartOptions(state.data.current, dark),
    ))
      draw(`${id}-chart`, option);
  }
  if (state.route === "scenarios" && state.data.scenarios.length)
    draw("scenario-chart", scenarioOption(state.data.scenarios, dark));
}
const resizeObserver = new ResizeObserver(() =>
  charts.forEach((c) => c.resize()),
);
resizeObserver.observe($("#content"));

function render() {
  // 原生单页视图，不刷新文档；所有模板中的用户文字均经 esc 转义。
  if (!state.user || !state.config) return;
  const route = location.hash.slice(1) || "home";
  state.route = Object.hasOwn(views, route) ? route : "home";
  if (state.route === "news") newsCategory = "全部";
  $("#content").innerHTML = views[state.route](state);
  $("#page-title").textContent = titles[state.route];
  document.title = `${titles[state.route]} · 港企投资智能评测平台`;
  document.querySelectorAll("[data-nav]").forEach((a) => {
    a.classList.toggle("active", a.dataset.nav === state.route);
    if (a.dataset.nav === state.route) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
  $("#sidebar").classList.remove("open");
  $(".mobile-menu").setAttribute("aria-expanded", "false");
  requestAnimationFrame(drawCharts);
}

function switchAuth(mode) {
  state.authMode = mode;
  $("#confirm-field").hidden = mode !== "register";
  $("#auth-title").textContent =
    mode === "register" ? "创建您的账号" : "欢迎登录";
  $("#auth-description").textContent =
    mode === "register"
      ? "建立本机模拟账号，开启投资评测"
      : "开启您的香港投资决策之旅";
  $("#auth-submit").innerHTML =
    mode === "register"
      ? "注册并进入平台 <span>→</span>"
      : "登录平台 <span>→</span>";
  $("#password").autocomplete =
    mode === "register" ? "new-password" : "current-password";
  document.querySelectorAll("[data-auth]").forEach((b) => {
    b.classList.toggle("active", b.dataset.auth === mode);
    b.setAttribute("aria-selected", String(b.dataset.auth === mode));
  });
  for (const id of ["username", "password", "confirm"]) {
    $(`#${id}-error`).textContent = "";
    $(`#${id}`).removeAttribute("aria-invalid");
  }
}

async function enter(user) {
  // 登录后才加载主业务视图；刷新时从本机恢复当前账号命名空间。
  const epoch = ++sessionEpoch;
  state.user = user;
  state.data = loadUser(user.id);
  $("#auth-screen").hidden = true;
  $("#application").hidden = false;
  $("#user-name").textContent = user.name;
  $("#user-avatar").textContent = user.name.slice(0, 1).toUpperCase();
  $("#content").innerHTML =
    '<div class="model-loading"><span class="spinner"></span>正在加载本地模型快照与官方资讯缓存…</div>';
  try {
    const [config, news] = await Promise.all([
      state.config ? Promise.resolve(state.config) : api("/config"),
      api("/news"),
    ]);
    if (epoch !== sessionEpoch) return;
    state.config = config;
    state.news = news;
    render();
    checkAlerts();
  } catch (error) {
    $("#content").innerHTML =
      `<section class="panel">${empty("服务暂时不可用", error.message, '<button class="btn" data-action="retry-load">重新加载</button>')}</section>`;
  }
}
function leave() {
  sessionEpoch++;
  logout();
  state.user = null;
  state.data = defaultUserData();
  state.busy = false;
  disposeCharts();
  $("#report-frame").srcdoc = "";
  for (const d of document.querySelectorAll("dialog[open]")) d.close();
  $("#content").innerHTML = "";
  $("#application").hidden = true;
  $("#auth-screen").hidden = false;
  $("#password").value = "";
  $("#confirm").value = "";
  switchAuth("login");
  document.title = "港企投资智能评测平台 · 登录";
}

$("#auth-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  $("#auth-submit").disabled = true;
  for (const id of ["username", "password", "confirm"]) {
    $(`#${id}-error`).textContent = "";
    $(`#${id}`).removeAttribute("aria-invalid");
  }
  try {
    const result = await authenticate(
      state.authMode,
      $("#username").value,
      $("#password").value,
      $("#confirm").value,
    );
    if (result.errors) {
      for (const [key, message] of Object.entries(result.errors)) {
        $(`#${key}-error`).textContent = message;
        $(`#${key}`).setAttribute("aria-invalid", "true");
      }
      return;
    }
    $("#password").value = "";
    $("#confirm").value = "";
    await enter(result.user);
  } catch (error) {
    $("#password-error").textContent = error.message;
  } finally {
    $("#auth-submit").disabled = false;
  }
});

window.addEventListener("hashchange", () => {
  if (state.user) {
    render();
    window.scrollTo({ top: 0 });
  }
});
document.addEventListener("click", async (event) => {
  const target = event.target.closest(
    "button,[data-open-project],[data-use-scenario]",
  );
  if (!target) return;
  try {
    if (target.dataset.auth) {
      switchAuth(target.dataset.auth);
      return;
    }
    const action = target.dataset.action;
    if (action === "theme") {
      const theme =
        document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      localStorage.setItem("hk-theme", theme);
      document.documentElement.dataset.theme = theme;
      drawCharts();
      return;
    }
    if (action === "logout") {
      leave();
      return;
    }
    if (action === "menu") {
      const open = $("#sidebar").classList.toggle("open");
      $(".mobile-menu").setAttribute("aria-expanded", String(open));
      return;
    }
    if (action === "retry-load") {
      await enter(state.user);
      return;
    }
    if (action === "close-news") {
      acknowledgeNews();
      $("#news-dialog").close();
      return;
    }
    if (action === "read-news") {
      acknowledgeNews();
      $("#news-dialog").close();
      location.hash = "news";
      return;
    }
    if (action === "alerts") {
      checkAlerts(true);
      return;
    }
    if (action === "close-report") {
      $("#report-dialog").close();
      $("#report-frame").srcdoc = "";
      return;
    }
    if (action === "preview-report" || action === "download-report") {
      await exportReport(action === "preview-report", target);
      return;
    }
    if (action === "save-project") {
      if (!state.data.current) return;
      if (
        state.data.projects.some((p) => p.report.id === state.data.current.id)
      ) {
        toast("相同输入与模型版本的报告已保存。");
        return;
      }
      if (state.data.projects.length >= 30) {
        toast("演示原型最多保存 30 个项目，请先导出并清理旧档案。");
        return;
      }
      const report = structuredClone(state.data.current),
        industry = state.config.industries.find(
          (i) => i.id === report.input.industry,
        );
      state.data.projects.unshift({
        id: crypto.randomUUID(),
        name: `${industry.name.split(" / ")[0]} · 赴港投资方案 ${state.data.projects.length + 1}`,
        createdAt: new Date().toISOString(),
        reviewAt: new Date(Date.now() + 30 * 86400000).toISOString(),
        subscribed: true,
        report,
      });
      persist();
      toast("项目已保存至当前浏览器账号，并开启站内相关资讯提醒。");
      return;
    }
    if (action === "add-scenario") {
      if (document.querySelectorAll("[data-scenario-row]").length >= 3) {
        toast("最多同时新增 3 组情景。");
        return;
      }
      $("#scenario-rows").insertAdjacentHTML(
        "beforeend",
        scenarioRow(state, scenarioSerial++),
      );
      return;
    }
    if (action === "remove-scenario") {
      if (document.querySelectorAll("[data-scenario-row]").length <= 1) {
        toast("请至少保留一组情景。");
        return;
      }
      target.closest("[data-scenario-row]").remove();
      return;
    }
    if (action === "export-tasks") {
      exportTasks();
      return;
    }
    if (action === "all-cases") {
      const saved = state.data.current;
      state.data.current = null;
      $("#content").innerHTML = views.cases(state);
      state.data.current = saved;
      return;
    }
    if (target.dataset.openProject) {
      const project = state.data.projects.find(
        (p) => p.id === target.dataset.openProject,
      );
      state.data.current = structuredClone(project.report);
      state.data.scenarios = [];
      persist();
      location.hash = "assessment";
      if (state.route === "assessment") render();
      return;
    }
    if (target.dataset.deleteProject) {
      state.data.projects = state.data.projects.filter(
        (p) => p.id !== target.dataset.deleteProject,
      );
      persist();
      render();
      toast("已删除这份浏览器本地项目档案。");
      return;
    }
    if (target.dataset.reviewProject) {
      const p = state.data.projects.find(
        (p) => p.id === target.dataset.reviewProject,
      );
      p.reviewAt = new Date(Date.now() + 30 * 86400000).toISOString();
      persist();
      render();
      toast("已记录复核，下次计划提醒为 30 天后。");
      return;
    }
    if (target.dataset.useScenario !== undefined) {
      state.data.current = structuredClone(
        state.data.scenarios[Number(target.dataset.useScenario)],
      );
      // 选中方案成为新的当前基准，清空旧比较，避免与新基准错误并列。
      state.data.scenarios = [];
      persist();
      location.hash = "assessment";
      return;
    }
    if (target.dataset.deleteConsultation) {
      state.data.consultations = state.data.consultations.filter(
        (x) => x.id !== target.dataset.deleteConsultation,
      );
      persist();
      render();
      return;
    }
    if (target.dataset.newsCategory) {
      newsCategory = target.dataset.newsCategory;
      document
        .querySelectorAll("[data-news-category]")
        .forEach((b) => b.classList.toggle("active", b === target));
      filterNews();
      return;
    }
    if (target.dataset.question) {
      $("#question").value = target.dataset.question;
      $("#question-form").requestSubmit();
      return;
    }
  } catch (error) {
    toast(error.message);
  }
});

document.addEventListener("change", (event) => {
  try {
    if (event.target.dataset.task) {
      state.data.tasks[
        `${state.data.current.id}:${event.target.dataset.task}`
      ] = event.target.checked;
      persist();
      event.target
        .closest(".timeline-item")
        .classList.toggle("task-done", event.target.checked);
    }
    if (event.target.dataset.subscribe) {
      state.data.projects.find(
        (p) => p.id === event.target.dataset.subscribe,
      ).subscribed = event.target.checked;
      persist();
      render();
    }
    if (event.target.id === "news-sort") filterNews();
    if (event.target.id === "library-category") filterLibrary();
  } catch (error) {
    toast(error.message);
  }
});
document.addEventListener("input", (event) => {
  if (event.target.id === "news-search") filterNews();
  if (event.target.id === "library-search") filterLibrary();
});
function filterNews() {
  const key = $("#news-search").value.trim().toLowerCase(),
    order = $("#news-sort").value === "asc" ? 1 : -1;
  const items = state.news.items
    .filter(
      (x) =>
        (newsCategory === "全部" || x.category === newsCategory) &&
        `${x.title} ${x.summary} ${x.publisher}`.toLowerCase().includes(key),
    )
    .sort((a, b) => {
      if (!a.publishedAt) return 1;
      if (!b.publishedAt) return -1;
      return a.publishedAt.localeCompare(b.publishedAt) * order;
    });
  $("#news-list").innerHTML = newsCards(items);
}
function filterLibrary() {
  const key = $("#library-search").value.trim().toLowerCase(),
    cat = $("#library-category").value;
  $("#library-list").innerHTML = policyCards(
    state.config.policies.filter(
      (x) =>
        (cat === "全部" || x.category === cat) &&
        `${x.title} ${x.summary} ${x.keywords.join(" ")}`
          .toLowerCase()
          .includes(key),
    ),
  );
}

function amount(value, name) {
  const text = String(value).trim(),
    n = Number(text);
  if (
    !text ||
    !Number.isFinite(n) ||
    n < 0 ||
    n > (name === "investmentCny" ? 10000000 : 100000000) ||
    (name === "investmentCny" && n < 1)
  )
    throw Object.assign(new Error("请检查金额范围"), {
      fields: {
        [name]:
          name === "investmentCny"
            ? "投资至少 1 万元，最多 1000 亿元"
            : "营收须为 0–1 万亿元",
      },
    });
  const yuan = n * 10000;
  if (Math.abs(yuan * 100 - Math.round(yuan * 100)) > 0.001)
    throw Object.assign(new Error("金额最多精确到人民币分"), {
      fields: { [name]: "金额最多精确到人民币分（万元最多 6 位小数）" },
    });
  return Math.round(yuan * 100) / 100;
}

document.addEventListener("submit", async (event) => {
  if (event.target.id === "assessment-form") {
    event.preventDefault();
    if (state.busy) return;
    const form = event.target,
      button = $("#assessment-submit"),
      epoch = sessionEpoch;
    document
      .querySelectorAll("[data-error]")
      .forEach((el) => (el.textContent = ""));
    try {
      const fields = new FormData(form),
        input = {
          industry: fields.get("industry"),
          investmentCny: amount(fields.get("investment"), "investmentCny"),
          revenueCny: amount(fields.get("revenue"), "revenueCny"),
          park: fields.get("park"),
          scale: fields.get("scale"),
        };
      state.busy = true;
      button.disabled = true;
      button.textContent = "双模型并行运算中…";
      $("#assessment-results").innerHTML =
        '<div class="panel model-loading"><span class="spinner"></span>正在并行运行盈利模型与风险模型，完成后统一呈现图表与报告…</div>';
      const result = await api("/assess", { input });
      if (epoch !== sessionEpoch) return;
      state.data.current = result;
      state.data.scenarios = [];
      persist();
      if (state.route === "assessment") {
        render();
        requestAnimationFrame(() =>
          $("#assessment-results")?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          }),
        );
      } else toast("双模型评测完成，可在评测页面查看。");
    } catch (error) {
      if (epoch !== sessionEpoch) return;
      for (const [key, message] of Object.entries(
        error.fields ?? { form: error.message },
      )) {
        const el = document.querySelector(`[data-error="${key}"]`);
        if (el) el.textContent = message;
      }
      if ($("#assessment-results")) {
        $("#assessment-results").innerHTML = state.data.current
          ? results(state, state.data.current)
          : "";
        drawCharts();
      }
      toast(error.message);
    } finally {
      state.busy = false;
      if (button.isConnected) {
        button.disabled = false;
        button.textContent = "运行双模型，生成评测报告 →";
      }
    }
  }
  if (event.target.id === "scenario-form") {
    event.preventDefault();
    const button = event.target.querySelector("[type=submit]"),
      epoch = sessionEpoch;
    if (button.disabled) return;
    try {
      const rows = [...document.querySelectorAll("[data-scenario-row]")];
      const scenarios = [
        {
          input: state.data.current.input,
          scenario: state.data.current.scenario,
        },
        ...rows.map((row) => ({
          input: {
            ...state.data.current.input,
            investmentCny: amount(
              row.querySelector("[name=investment]").value,
              "investmentCny",
            ),
            park: row.querySelector("[name=park]").value,
          },
          scenario: {
            delayYears: Number(row.querySelector("[name=delay]").value),
            region: row.querySelector("[name=region]").value || null,
          },
        })),
      ];
      button.disabled = true;
      button.textContent = "多组情景并行运算中…";
      $("#scenario-error").textContent = "";
      const reports = await api("/scenarios", { scenarios });
      if (epoch !== sessionEpoch) return;
      state.data.scenarios = reports;
      persist();
      if (state.route === "scenarios") {
        const { scenarioResults } = await import("./views.js");
        $("#scenario-results").innerHTML = scenarioResults(state, reports);
        drawCharts();
        $("#scenario-results").scrollIntoView({ behavior: "smooth" });
      }
    } catch (error) {
      if ($("#scenario-error"))
        $("#scenario-error").textContent = error.message;
      toast(error.message);
    } finally {
      button.disabled = false;
      button.textContent = "并行运行并对比 →";
    }
  }
  if (event.target.id === "consultation-form") {
    // 完全本地流程：此分支不调用 api/fetch，也不触发 mailto。
    event.preventDefault();
    const data = new FormData(event.target),
      name = data.get("name").trim(),
      message = data.get("message").trim(),
      email = data.get("email").trim();
    if (
      !name ||
      name.length > 40 ||
      message.length < 5 ||
      message.length > 1000 ||
      (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    ) {
      $("#consultation-error").textContent =
        "请填写称呼、5–1000 字咨询内容，并检查邮箱格式。";
      return;
    }
    try {
      state.data.consultations.unshift({
        id: crypto.randomUUID(),
        name,
        company: data.get("company").trim(),
        email,
        message,
        createdAt: new Date().toISOString(),
      });
      state.data.consultations = state.data.consultations.slice(0, 50);
      persist();
      render();
      toast("已保存到浏览器本地，没有发送网络咨询请求。");
    } catch (error) {
      toast(error.message);
    }
  }
  if (event.target.id === "question-form") {
    event.preventDefault();
    const input = $("#question"),
      question = input.value.trim(),
      button = event.target.querySelector("button"),
      epoch = sessionEpoch;
    if (!question || button.disabled) return;
    const messages = $("#chat-messages");
    messages.insertAdjacentHTML(
      "beforeend",
      `<div class="chat-message user">${esc(question)}</div>`,
    );
    input.value = "";
    button.disabled = true;
    try {
      const answer = await api("/question", { question });
      if (epoch !== sessionEpoch || !messages.isConnected) return;
      messages.insertAdjacentHTML(
        "beforeend",
        `<div class="chat-message"><strong>${esc(answer.mode)}</strong>${esc(answer.answer)}${answer.sources.map((s) => `<p><a class="official-link" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)} ↗</a></p>`).join("")}</div>`,
      );
    } catch (error) {
      toast(error.message);
    } finally {
      button.disabled = false;
    }
  }
});

async function exportReport(preview, button) {
  const r = state.data.current;
  if (!r) return;
  button.disabled = true;
  const label = button.textContent;
  button.textContent = preview ? "准备预览…" : "生成 PDF…";
  const epoch = sessionEpoch,
    version = $("#report-version").value;
  try {
    const result = await api(
      `/reports/${version}${preview ? "?format=html" : ""}`,
      {
        input: r.input,
        scenario: r.scenario,
        expectedModelHash: r.meta.modelHash,
      },
    );
    if (epoch !== sessionEpoch) return;
    if (preview) {
      $("#report-frame").srcdoc = result;
      $("#report-dialog").showModal();
    } else download(result, `企业赴港投资评测-${version}-${r.id}.pdf`);
  } finally {
    button.disabled = false;
    button.textContent = label;
  }
}
function download(blob, name) {
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
function exportTasks() {
  const r = state.data.current;
  if (!r) return;
  const rows = [
    ["阶段", "计划节点（非法定期限）", "任务", "内容", "官方入口", "已完成"],
    ...r.landing.tasks.map((t) => [
      t.stage,
      t.offset,
      t.title,
      t.details,
      t.url,
      state.data.tasks[`${r.id}:${t.id}`] ? "是" : "否",
    ]),
  ];
  const csv =
    "\ufeff" +
    rows
      .map((row) =>
        row.map((v) => '"' + String(v).replaceAll('"', '""') + '"').join(","),
      )
      .join("\r\n");
  download(
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
    `落地任务-${r.id}.csv`,
  );
}

function acknowledgeNews() {
  state.data.seenNews = [
    ...new Set([...state.data.seenNews, ...state.news.items.map((x) => x.id)]),
  ].slice(-1000);
  persist();
  $("#news-dot").hidden = true;
  $("#alert-count").hidden = true;
}
function checkAlerts(force = false) {
  if (!state.user || !state.config) return;
  const unseen = state.news.items.filter(
    (x) => !state.data.seenNews.includes(x.id),
  );
  const targeted = state.data.projects.flatMap((p) => projectAlerts(state, p));
  $("#news-dot").hidden = unseen.length === 0;
  $("#alert-count").hidden = unseen.length === 0 && targeted.length === 0;
  if (unseen.length || force) {
    $("#news-dialog-text").textContent = unseen.length
      ? `发现 ${unseen.length} 条尚未阅览的官方公告。${targeted.length ? `另有 ${targeted.length} 条项目相关提醒，可前往项目档案查看。` : ""}最近成功抓取：${dateTime(state.news.lastSuccessAt)}。`
      : `暂无未读官方公告。${targeted.length ? `有 ${targeted.length} 条项目相关提醒，请在项目档案查看。` : "暂无项目相关提醒。"}`;
    if (!$("#report-dialog").open && !$("#news-dialog").open)
      $("#news-dialog").showModal();
  }
}
$("#news-dialog").addEventListener("cancel", () => {
  try {
    acknowledgeNews();
  } catch (error) {
    toast(error.message);
  }
});
setInterval(async () => {
  if (!state.user || document.hidden) return;
  const epoch = sessionEpoch;
  try {
    const news = await api("/news");
    if (epoch !== sessionEpoch) return;
    const changed =
      news.revision !== state.news.revision ||
      news.lastAttemptAt !== state.news.lastAttemptAt;
    state.news = news;
    if (changed) {
      if (
        state.route === "home" ||
        state.route === "news" ||
        state.route === "projects"
      )
        render();
      checkAlerts();
    }
  } catch {
    /* 后端暂时不可达时保留页面，不伪造抓取成功状态。 */
  }
}, 60000);
try {
  const user = currentUser();
  if (user) await enter(user);
} catch (error) {
  toast(error.message);
}