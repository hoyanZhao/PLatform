import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import puppeteer from "puppeteer";
import { createApp } from "../server/index.js";
import { ROOT } from "../server/config.js";
import { browserOptions } from "../server/browser-options.js";

// 真实浏览器验收：模拟账号、数据隔离、模型交互、三版 PDF 及移动端溢出。
const server = createApp().listen(0, "127.0.0.1");
await new Promise((resolve) => server.once("listening", resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await puppeteer.launch(browserOptions());
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 1050, deviceScaleFactor: 1 });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const artifactDir =
  process.env.BROWSER_ARTIFACTS_DIR || path.join(ROOT, "examples");
await mkdir(artifactDir, { recursive: true });
const password = "TestPass123!";
async function click(selector) {
  await page.waitForSelector(selector, { visible: true });
  await page.click(selector);
}
async function value(selector, text) {
  await page.$eval(
    selector,
    (el, text) => {
      el.value = text;
      el.dispatchEvent(new Event("input", { bubbles: true }));
    },
    text,
  );
}
async function route(name) {
  await page.evaluate((name) => (location.hash = name), name);
  await page.waitForFunction(
    (label) => document.querySelector("#page-title").textContent === label,
    {},
    {
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
    }[name],
  );
}
async function closeNews() {
  if (await page.$eval("#news-dialog", (e) => e.open))
    await click('[data-action="close-news"]');
}
async function register(name) {
  await click('[data-auth="register"]');
  await value("#username", name);
  await value("#password", password);
  await value("#confirm", password);
  await click("#auth-submit");
  await page.waitForSelector("#application:not([hidden])");
  await page.waitForSelector(".page-heading");
  await closeNews();
}
try {
  await page.goto(base, { waitUntil: "networkidle0" });
  assert.equal(await page.$eval("#application", (e) => e.hidden), true);
  await page.screenshot({
    path: path.join(artifactDir, "login-desktop.png"),
    fullPage: true,
  });
  await click('[data-auth="register"]');
  await value("#username", "演示企业甲");
  await value("#password", password);
  await value("#confirm", "different");
  await click("#auth-submit");
  await page.waitForFunction(() =>
    document.querySelector("#confirm-error").textContent.includes("不一致"),
  );
  await value("#confirm", password);
  await click("#auth-submit");
  await page.waitForSelector(".page-heading");
  await closeNews();
  await page.screenshot({
    path: path.join(artifactDir, "dashboard-desktop.png"),
    fullPage: true,
  });
  const storage = await page.evaluate(() =>
    localStorage.getItem("hk-accounts-v1"),
  );
  assert.ok(!storage.includes(password));
  assert.match(storage, /"hash":"[a-f0-9]{64}"/);
  await route("assessment");
  await value("#investment", "-1");
  await click("#assessment-submit");
  await page.waitForFunction(
    () =>
      document.querySelector('[data-error="investmentCny"]').textContent
        .length > 0,
  );
  await value("#investment", "500");
  await click("#assessment-submit");
  await page.waitForSelector("#tax-chart svg");
  await page.waitForSelector("#risk-chart svg");
  assert.equal(
    await page.$$eval(
      "#assessment-form select,#assessment-form input",
      (els) => els.length,
    ),
    5,
  );
  await click('[data-action="save-project"]');
  await click('[data-task="company"]');
  await page.reload({ waitUntil: "networkidle0" });
  await page.waitForSelector("#risk-chart svg");
  await closeNews();
  assert.equal(
    await page.$eval('[data-task="company"]', (e) => e.checked),
    true,
  );
  await page.screenshot({
    path: path.join(artifactDir, "assessment-desktop.png"),
    fullPage: true,
  });
  await click('[data-action="preview-report"]');
  await page.waitForFunction(
    () => document.querySelector("#report-dialog").open,
  );
  const frame = await (await page.$("#report-frame")).contentFrame();
  await frame.waitForSelector("h1");
  assert.match(await frame.$eval("h1", (e) => e.textContent), /企业赴港投资/);
  await click('[data-action="close-report"]');
  const report = await page.evaluate(() => {
    const user = JSON.parse(localStorage.getItem("hk-demo-session-v1"));
    return JSON.parse(localStorage.getItem("hk-user-v1:" + user.id)).current;
  });
  for (const version of ["full", "executive", "compliance"]) {
    const response = await fetch(`${base}/api/reports/${version}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: report.input,
        scenario: report.scenario,
        expectedModelHash: report.meta.modelHash,
      }),
    });
    assert.equal(
      response.status,
      200,
      await response
        .clone()
        .text()
        .then((s) => s.slice(0, 100)),
    );
    const bytes = Buffer.from(await response.arrayBuffer());
    assert.equal(bytes.subarray(0, 4).toString(), "%PDF");
    assert.ok(bytes.length > 20000);
    await writeFile(path.join(artifactDir, `report-${version}.pdf`), bytes);
  }
  await route("scenarios");
  await page.select('[name="delay"]', "2");
  await page.select('[name="region"]', "asean");
  await click('#scenario-form [type="submit"]');
  await page.waitForSelector("#scenario-chart svg");
  assert.match(
    await page.$eval("#scenario-results", (e) => e.textContent),
    /东盟/,
  );
  await click('[data-action="add-scenario"]');
  await click('[data-action="add-scenario"]');
  assert.equal(
    await page.$$eval("[data-scenario-row]", (els) => els.length),
    3,
  );
  await click('[data-use-scenario="1"]');
  await page.waitForSelector("#tax-chart svg");
  assert.equal(await page.$eval("#investment", el => Number(el.value)), 250);
  await route("scenarios");
  assert.equal(await page.$("#scenario-chart"), null);
  await route("library");
  await value("#library-search", "高端人才");
  assert.equal(
    await page.$$eval("#library-list .listing-card", (els) => els.length),
    1,
  );
  await route("assistant");
  await click("[data-question]");
  await page.waitForFunction(
    () => document.querySelectorAll(".chat-message").length === 3,
  );
  assert.match(
    await page.$eval("#chat-messages", (e) => e.textContent),
    /官方|ESS/,
  );
  await route("consultation");
  await value("#contact-name", "模拟联系人");
  await value("#contact-message", "希望了解赴港投资和合规办理流程。");
  const consultationRequests = [];
  const listen = (req) => {
    if (req.method() === "POST") consultationRequests.push(req.url());
  };
  page.on("request", listen);
  await click('#consultation-form [type="submit"]');
  await page.waitForFunction(() =>
    document
      .querySelector("#content")
      .textContent.includes("本地咨询记录（1）"),
  );
  page.off("request", listen);
  assert.equal(consultationRequests.length, 0);
  await click('[data-action="logout"]');
  await register("演示企业乙");
  await route("projects");
  assert.match(
    await page.$eval("#content", (e) => e.textContent),
    /还没有保存的项目/,
  );
  await route("consultation");
  assert.match(
    await page.$eval("#content", (e) => e.textContent),
    /本地咨询记录（0）/,
  );
  await click('[data-action="logout"]');
  await click('[data-auth="register"]');
  await value("#username", "演示企业甲");
  await value("#password", password);
  await value("#confirm", password);
  await click("#auth-submit");
  await page.waitForFunction(() =>
    document.querySelector("#username-error").textContent.includes("已注册"),
  );
  await click('[data-auth="login"]');
  await value("#password", "WrongPassword");
  await click("#auth-submit");
  await page.waitForFunction(() =>
    document.querySelector("#password-error").textContent.includes("不正确"),
  );
  await value("#password", password);
  await click("#auth-submit");
  await page.waitForSelector(".page-heading");
  await closeNews();
  await route("projects");
  assert.match(
    await page.$eval("#content", (e) => e.textContent),
    /赴港投资方案/,
  );
  await route("home");
  await click('#application [data-action="theme"]');
  const theme = await page.$eval("html", (e) => e.dataset.theme);
  await page.reload({ waitUntil: "networkidle0" });
  assert.equal(await page.$eval("html", (e) => e.dataset.theme), theme);
  await closeNews();
  await page.screenshot({
    path: path.join(artifactDir, "dashboard-dark.png"),
    fullPage: true,
  });
  for (const width of [390, 320]) {
    await page.setViewport({ width, height: 844, deviceScaleFactor: 1 });
    for (const name of Object.keys({
      home: 1,
      assessment: 1,
      scenarios: 1,
      projects: 1,
      news: 1,
      library: 1,
      cases: 1,
      parks: 1,
      talent: 1,
      assistant: 1,
      consultation: 1,
      disclaimer: 1,
    })) {
      await route(name);
      const dimensions = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        width: innerWidth,
      }));
      if (dimensions.scroll > dimensions.width + 1) {
        console.log(
          await page.evaluate(() =>
            [...document.querySelectorAll("body *")]
              .map((el) => ({
                tag: el.tagName,
                cls: el.className,
                text: el.textContent.slice(0, 60),
                right: el.getBoundingClientRect().right,
                width: el.getBoundingClientRect().width,
              }))
              .filter((x) => x.right > innerWidth + 1 && x.width > 0),
          ),
        );
        await page.screenshot({
          path: path.join(artifactDir, "layout-failure.png"),
          fullPage: true,
        });
      }
      assert.ok(
        dimensions.scroll <= dimensions.width + 1,
        `${name} 在 ${width}px 横向溢出：${JSON.stringify(dimensions)}`,
      );
    }
    await route("home");
    if (width === 390) {
      await page.waitForFunction(() => document.querySelector('#sidebar').getBoundingClientRect().right <= 1);
      await page.screenshot({
        path: path.join(artifactDir, "dashboard-mobile.png"),
        fullPage: true,
      });
    }
  }
  assert.deepEqual(errors, []);
  console.log(
    "浏览器验收通过：账号验证与隔离、刷新保持、五字段双模型、图表、任务持久化、三版本 PDF、情景对比、文库检索、知识库问答、本地咨询、主题保持、12 个视图在 390/320px 无页面溢出。",
  );
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
