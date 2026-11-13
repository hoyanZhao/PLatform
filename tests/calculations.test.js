import test from "node:test";
import assert from "node:assert/strict";
import { snapshot } from "../server/config.js";
import { assess } from "../server/assessment.js";
import { hkTax } from "../server/models/common.js";
import { validateAssessment, validateScenario } from "../server/validation.js";

const input = {
  industry: "technology",
  investmentCny: 5000000,
  revenueCny: 15000000,
  park: "cyberport",
  scale: "small",
};
test("香港税率边界：亏损、零利润、首档临界点与超额", () => {
  const rule = snapshot.rules.official.hkProfitsTax;
  assert.equal(hkTax(-100, rule, true), 0);
  assert.equal(hkTax(0, rule, true), 0);
  assert.equal(hkTax(2000000, rule, true), 165000);
  assert.equal(hkTax(3000000, rule, true), 330000);
  assert.equal(hkTax(2000000, rule, false), 330000);
});
test("五字段格式、防越界、防非法参数注入", () => {
  for (const invalid of [
    { ...input, investmentCny: -1 },
    { ...input, investmentCny: Infinity },
    { ...input, revenueCny: "100" },
    { ...input, scale: "__proto__" },
    { ...input, industry: "unknown" },
    { ...input, taxRate: 0 },
    { ...input, investmentCny: 1.001 },
  ])
    assert.throws(() => validateAssessment(invalid));
  assert.throws(() => validateScenario({ delayYears: -1 }));
  assert.throws(() => validateScenario({ delayYears: 2.5 }));
  assert.throws(() => validateScenario({ region: "__proto__" }));
  assert.deepEqual(validateAssessment({ ...input, revenueCny: 0 }), {
    ...input,
    revenueCny: 0,
  });
});
test("相同输入、规则与情景得到完全相同报告，无时间戳和随机值影响", async () => {
  const [a, b] = await Promise.all([assess(input), assess(input)]);
  assert.deepEqual(a, b);
  assert.equal(a.meta.lastHumanVerifiedAt, null);
  assert.equal(a.meta.fx, 1.08);
});
test("未确认资助不进基础利润，香港基础不默认两级制", async () => {
  const r = await assess(input);
  assert.ok(r.alternative.potentialGrant.cny > 0);
  for (const y of r.profit.years) {
    assert.equal(y.confirmedSubsidy.cny, 0);
    assert.equal(
      y.hkTax.hkd,
      hkTax(y.preTax.hkd, snapshot.rules.official.hkProfitsTax, false),
    );
    assert.ok(Math.abs(y.net.hkd - (y.preTax.hkd - y.hkTax.hkd)) < 0.02);
  }
  assert.equal(r.talent.potentialTalentSupport.claimableHkd, null);
  assert.equal(
    r.alternative.threeYearNet.hkd,
    Math.round(
      (r.profit.cumulativeNet.hkd + r.alternative.potentialGrant.hkd) * 100,
    ) / 100,
  );
});
test("零营收与资金不足可测算，亏损不生成负税款", async () => {
  const r = await assess({ ...input, revenueCny: 0, investmentCny: 10000 });
  assert.equal(r.profit.rating, "谨慎投资");
  assert.ok(r.profit.cumulativeNet.cny < 0);
  for (const y of r.profit.years) {
    assert.equal(y.hkTax.hkd, 0);
    assert.equal(y.mainland.vatCny, 0);
    assert.equal(y.mainland.citCny, 0);
  }
  assert.ok(Number.isFinite(r.profit.roi));
});
test("行业、规模、园区全组合输出有限值，预算分期不超支", async () => {
  for (const industry of snapshot.industries)
    for (const scale of Object.keys(snapshot.rules.assumptions.scale)) {
      const r = await assess({
        ...input,
        industry: industry.id,
        scale,
        park: industry.id === "manufacturing" ? "tko" : "central",
      });
      assert.ok(r.risk.score >= 0 && r.risk.score <= 100);
      assert.ok(Number.isFinite(r.profit.cumulativeNet.hkd));
      assert.equal(
        Math.round(
          r.landing.phases.reduce((n, p) => n + p.amount.cny, 0) * 100,
        ),
        input.investmentCny * 100,
      );
      assert.equal(
        r.talent.roles.reduce((n, p) => n + p.count, 0),
        r.talent.total,
      );
      assert.ok(r.talent.roles.every((p) => p.count >= 1));
    }
});
test("推迟两年增加成本与政策风险，但不臆造未来政策；出海单列不改利润", async () => {
  const base = await assess(input),
    late = await assess(input, { delayYears: 2, region: "asean" }),
    overseas = await assess(input, { delayYears: 0, region: "asean" });
  assert.ok(late.profit.cumulativeNet.cny < base.profit.cumulativeNet.cny);
  assert.ok(late.risk.score >= base.risk.score);
  assert.deepEqual(overseas.profit, base.profit);
  assert.ok(overseas.overseas.selected.increment.cny > 0);
  assert.equal(late.meta.version, base.meta.version);
});
