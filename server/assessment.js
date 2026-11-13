import { Worker } from "node:worker_threads";
import { createHash } from "node:crypto";
import { snapshot } from "./config.js";
import { validateAssessment, validateScenario } from "./validation.js";
import { matchPolicies } from "./models/policy-match.js";
import { talentModel } from "./models/talent.js";
import { landingModel, overseasModel } from "./models/landing.js";
import { money, dual } from "./models/common.js";

function run(type, input, scenario, config) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./model-worker.js", import.meta.url), {
      workerData: { type, input, scenario, config },
    });
    const timer = setTimeout(() => {
      worker.terminate();
      reject(new Error("模型运行超时，请重试"));
    }, 12000);
    worker.once("message", (message) => {
      clearTimeout(timer);
      message.ok ? resolve(message.result) : reject(new Error(message.error));
    });
    worker.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    worker.once("exit", (code) => {
      clearTimeout(timer);
      if (code !== 0) reject(new Error("模型工作线程异常退出"));
    });
  });
}

export async function assess(raw, scenarioRaw = {}, config = snapshot) {
  const input = validateAssessment(raw);
  const scenario = validateScenario(scenarioRaw);
  // 两个独立线程真正并行，等两者成功后才整合，客户端永远不会收到半份报告。
  const [profit, risk] = await Promise.all([
    run("profit", input, scenario, config),
    run("risk", input, scenario, config),
  ]);
  const policies = matchPolicies(input, config);
  const talent = talentModel(input, config);
  const landing = landingModel(input, config, profit, risk, scenario);
  const overseas = overseasModel(input, config, scenario);
  const limits = config.rules.assumptions.profitLevels;
  const rating =
    profit.roi >= limits.highRoi && risk.score < limits.maximumHighRisk
      ? "高度盈利"
      : profit.roi >= limits.steadyRoi && profit.years[2].net.cny > 0
        ? "稳健经营"
        : "谨慎投资";
  const potential =
    policies.find((p) => p.id === "ess")?.estimated ??
    dual(0, config.rules.assumptions.fxHkdPerCny);
  const alternative = {
    note: "以下情景并非预测获批；假设全部获批且第二年到账，不与人才敏感性预算相加，须核查税务处理及重复资助限制。",
    potentialGrant: potential,
    secondYearNet: dual(
      profit.years[1].net.hkd + potential.hkd,
      config.rules.assumptions.fxHkdPerCny,
    ),
    threeYearNet: dual(
      profit.cumulativeNet.hkd + potential.hkd,
      config.rules.assumptions.fxHkdPerCny,
    ),
    twoTierTaxSavings: dual(
      profit.years.reduce((n, y) => n + y.possibleTwoTierSaving.hkd, 0),
      config.rules.assumptions.fxHkdPerCny,
    ),
    grantTaxNote:
      "此为不考虑资助税务影响的乐观敏感性上界；实际资助是否应税、支付时间与认可支出须另核验。",
  };
  const modelHash = createHash("sha256")
    .update(JSON.stringify(config))
    .digest("hex");
  const id = createHash("sha256")
    .update(JSON.stringify({ input, scenario, modelHash }))
    .digest("hex")
    .slice(0, 20);
  return {
    id,
    input,
    scenario,
    meta: {
      version: config.rules.version,
      modelHash,
      sourceCheckedAt: config.rules.sourceCheckedAt,
      lastHumanVerifiedAt: config.rules.lastHumanVerifiedAt,
      fx: config.rules.assumptions.fxHkdPerCny,
      disclaimer: config.rules.disclaimer,
      newsDisclaimer: config.rules.newsDisclaimer,
      scaleMapping: profit.scaleMapping,
    },
    profit: { ...profit, rating },
    risk,
    policies,
    talent,
    landing,
    overseas,
    alternative,
    narrative: {
      conclusion: `在固定演示参数及未确认资助的基础情景下，三年累计净利润为人民币 ${money(profit.cumulativeNet.cny / 10000)} 万元，预算回报率 ${(profit.roi * 100).toFixed(1)}%，盈利评级为“${rating}”。该评级为程序规则输出，不是投资建议。`,
      risk: `综合风险 ${risk.score}/100（${risk.level}）。优先处理：${risk.items
        .slice()
        .sort((a, b) => b.score - a.score)
        .slice(0, 2)
        .map((x) => x.name)
        .join("、")}。`,
      landing: `演示推荐 ${landing.recommendedPark.name}，采用分阶段预算安排。园区入驻、行业牌照、跨境资金及人才资格须在实际承诺支出前独立复核。`,
    },
  };
}
