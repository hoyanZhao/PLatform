import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../server/index.js";
const input = {
  industry: "technology",
  investmentCny: 5000000,
  revenueCny: 15000000,
  park: "cyberport",
  scale: "small",
};

test("HTTP：完整双模型、格式校验、情景批次与三版本报告", async () => {
  const server = createApp().listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = (url, body) =>
    fetch(base + url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  try {
    assert.equal((await fetch(base + "/api/health")).status, 200);
    assert.equal(
      (await post("/api/assess", { input: { ...input, investmentCny: -1 } }))
        .status,
      400,
    );
    const response = await post("/api/assess", { input });
    assert.equal(response.status, 200);
    const report = await response.json();
    assert.ok(report.profit && report.risk && report.landing && report.talent);
    const scenarios = await post("/api/scenarios", {
      scenarios: [
        { input },
        {
          input: { ...input, investmentCny: 2500000 },
          scenario: { delayYears: 2 },
        },
      ],
    });
    assert.equal((await scenarios.json()).length, 2);
    assert.equal(
      (await post("/api/scenarios", { scenarios: Array(5).fill({ input }) }))
        .status,
      400,
    );
    for (const version of ["full", "executive", "compliance"]) {
      const res = await post(`/api/reports/${version}?format=html`, {
        input,
        expectedModelHash: report.meta.modelHash,
      });
      assert.equal(res.status, 200);
      const html = await res.text();
      assert.match(html, /企业赴港投资智能评测报告/);
      assert.match(html, /项目演示假设/);
      assert.match(html, /尚未人工核验/);
      if (version === "compliance") {
        assert.match(html, /风险体检/);
        assert.doesNotMatch(html, /三年累计净利润<\/td>/);
      }
    }
    assert.equal(
      (
        await post("/api/reports/full", {
          input,
          expectedModelHash: "obsolete",
        })
      ).status,
      409,
    );
    assert.equal((await post("/api/reports/invalid", { input })).status, 400);
    const cross = await fetch(base + "/api/assess", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://evil.example",
      },
      body: JSON.stringify({ input }),
    });
    assert.equal(cross.status, 403);
    assert.equal((await fetch(base + "/data/rules.json")).status, 404);
    assert.equal((await fetch(base + "/storage/news-cache.json")).status, 404);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
