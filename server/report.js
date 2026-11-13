import { readFileSync } from "node:fs";
import path from "node:path";
import * as echarts from "echarts";
import puppeteer from "puppeteer";
import { ROOT } from "./config.js";
import { chartOptions } from "../public/js/charts.js";
import { renderReport } from "../public/js/report-template.js";
import { browserOptions } from "./browser-options.js";

export function buildReportHtml(result, config, version) {
  const graphs = {};
  if (version !== "executive")
    for (const [id, option] of Object.entries(chartOptions(result))) {
      const chart = echarts.init(null, null, {
        renderer: "svg",
        ssr: true,
        width: 740,
        height: 340,
      });
      chart.setOption(option);
      graphs[id] =
        `<div class="report-graph">${chart.renderToSVGString()}</div>`;
      chart.dispose();
    }
  // 字体内嵌：PDF 生成全程不访问外网，Linux 环境同样能显示中文。
  const font = readFileSync(
    path.join(ROOT, "assets/fonts/NotoSansSC-Regular.ttf"),
  ).toString("base64");
  const css = readFileSync(
    path.join(ROOT, "public/css/report.css"),
    "utf8",
  ).replace(
    "url('/assets/fonts/NotoSansSC-Regular.ttf')",
    `url('data:font/ttf;base64,${font}')`,
  );
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>企业赴港投资智能评测报告</title><style>${css}</style></head><body><main class="document">${renderReport(result, config, version, graphs)}</main></body></html>`;
}

export async function reportPdf(html) {
  const browser = await puppeteer.launch(browserOptions());
  try {
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    // 报告只有本地生成的 HTML/SVG/内嵌字体；禁用联网加载，原文链接仍可在 PDF 点击。
    page.on("request", (request) =>
      request.url().startsWith("data:") || request.url() === "about:blank"
        ? request.continue()
        : request.abort(),
    );
    await page.setContent(html, { waitUntil: "load", timeout: 30000 });
    await page.evaluate(() => document.fonts.ready);
    return await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      timeout: 30000,
      displayHeaderFooter: true,
      headerTemplate: "<span></span>",
      footerTemplate:
        '<div style="font-size:8px;text-align:center;width:100%;color:#687485"><span class="pageNumber"></span> / <span class="totalPages"></span> · HK INVEST DEMO</div>',
    });
  } finally {
    await browser.close();
  }
}
