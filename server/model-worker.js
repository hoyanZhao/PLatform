import { parentPort, workerData } from "node:worker_threads";
import { profitModel } from "./models/profit.js";
import { riskModel } from "./models/risk.js";
try {
  const { type, input, config, scenario } = workerData;
  const result =
    type === "profit"
      ? profitModel(input, config, scenario)
      : riskModel(input, config, scenario);
  parentPort.postMessage({ ok: true, result });
} catch (error) {
  parentPort.postMessage({ ok: false, error: error.message });
}
