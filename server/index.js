import express from "express";
import { ROOT, snapshot } from "./config.js";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assess } from "./assessment.js";
import { ValidationError } from "./validation.js";
import { readNews, startNewsScheduler } from "./news.js";
import { answerQuestion } from "./knowledge.js";
import { buildReportHtml, reportPdf } from "./report.js";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use((req, res, next) => {
    res.set({
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "X-Frame-Options": "DENY",
    });
    // 无跨域读取许可；浏览器数据不会上传到项目存储，接口只接受当次测算参数。
    if (
      req.method === "POST" &&
      req.headers.origin &&
      req.headers.origin !== `${req.protocol}://${req.get("host")}`
    )
      return res.status(403).json({ error: "不接受跨来源提交" });
    next();
  });
  app.use(express.json({ limit: "40kb" }));
  app.use("/api", (req, res, next) => {
    if (
      req.method === "POST" &&
      (!req.body || typeof req.body !== "object" || Array.isArray(req.body))
    )
      return res.status(400).json({ error: "请提交 JSON 对象" });
    next();
  });
  app.get("/api/health", (_, res) =>
    res.json({ ok: true, version: snapshot.rules.version }),
  );
  app.get("/api/config", (_, res) => res.json(snapshot));
  app.get("/api/news", async (_, res, next) => {
    try {
      res.set("Cache-Control", "no-store").json(await readNews());
    } catch (e) {
      next(e);
    }
  });
  // 限制昂贵的工作线程与 PDF 并发，避免重复点击造成资源堆积。
  let modelsActive = 0,
    pdfActive = 0;
  app.post("/api/assess", async (req, res, next) => {
    if (modelsActive >= 8)
      return res.status(429).json({ error: "评测繁忙，请稍后重试" });
    modelsActive++;
    try {
      res.json(await assess(req.body.input, req.body.scenario));
    } catch (e) {
      next(e);
    } finally {
      modelsActive--;
    }
  });
  app.post("/api/scenarios", async (req, res, next) => {
    try {
      if (
        !Array.isArray(req.body.scenarios) ||
        req.body.scenarios.length < 1 ||
        req.body.scenarios.length > 4
      )
        throw new ValidationError({ scenarios: "一次比较 1–4 组情景" });
      if (modelsActive + req.body.scenarios.length > 8)
        return res.status(429).json({ error: "评测繁忙，请稍后重试" });
      const n = req.body.scenarios.length;
      modelsActive += n;
      try {
        res.json(
          await Promise.all(
            req.body.scenarios.map((s) => assess(s.input, s.scenario)),
          ),
        );
      } finally {
        modelsActive -= n;
      }
    } catch (e) {
      next(e);
    }
  });
  app.post("/api/question", (req, res) => {
    const result = answerQuestion(req.body.question);
    res.status(result.error ? 400 : 200).json(result);
  });
  app.post("/api/reports/:version", async (req, res, next) => {
    if (!["full", "executive", "compliance"].includes(req.params.version))
      return res.status(400).json({ error: "报告版本无效" });
    if (pdfActive >= 2)
      return res.status(429).json({ error: "报告生成繁忙，请稍后重试" });
    pdfActive++;
    try {
      // 从五字段重新运算，拒绝信任客户端伪造的盈利、资助或风险结果。
      const result = await assess(req.body.input, req.body.scenario);
      if (
        req.body.expectedModelHash &&
        req.body.expectedModelHash !== result.meta.modelHash
      )
        return res
          .status(409)
          .json({
            error:
              "该历史报告的模型快照与当前配置不同。请重新评测后导出，避免静默改变历史结果。",
          });
      const html = buildReportHtml(result, snapshot, req.params.version);
      if (req.query.format === "html") return res.type("html").send(html);
      const pdf = await reportPdf(html);
      res
        .set(
          "Content-Disposition",
          `attachment; filename="hk-assessment-${req.params.version}-${result.id}.pdf"`,
        )
        .type("pdf")
        .send(Buffer.from(pdf));
    } catch (e) {
      next(e);
    } finally {
      pdfActive--;
    }
  });
  app.use(
    "/vendor/echarts",
    express.static(path.join(ROOT, "node_modules/echarts/dist"), {
      maxAge: "7d",
    }),
  );
  app.use(
    "/assets",
    express.static(path.join(ROOT, "assets"), { maxAge: "7d" }),
  );
  app.use(express.static(path.join(ROOT, "public")));
  app.use((_, res) => res.status(404).json({ error: "页面或接口不存在" }));
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    const status = error.status ?? 500;
    if (status >= 500) console.error(error);
    res
      .status(status)
      .json({
        error:
          status >= 500 ? "处理失败，请重试或检查本地运行环境" : error.message,
        fields: error.fields,
      });
  });
  return app;
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const port = Number(process.env.PORT ?? 3000),
    host = process.env.HOST ?? "127.0.0.1";
  createApp().listen(port, host, () => {
    console.log(`港企投资智能评测平台 http://${host}:${port}`);
    startNewsScheduler();
  });
}
