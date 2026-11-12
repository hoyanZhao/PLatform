/** 独立、可复用的 ECharts 配置。后端 PDF 使用相同配置生成 SVG。 */
export function chartOptions(report, dark = false) {
  const text = dark ? "#d8e2ef" : "#526176";
  const grid = dark ? "#2c3b51" : "#e9eef3";
  const blue = "#407de9",
    teal = "#2cb69c",
    gold = "#c99b49";
  const base = {
    animation: false,
    textStyle: { color: text, fontFamily: "sans-serif" },
    tooltip: { trigger: "axis", confine: true },
    grid: { left: 72, right: 24, top: 48, bottom: 42 },
  };
  const axis = {
    axisLine: { lineStyle: { color: grid } },
    axisTick: { show: false },
    axisLabel: { color: text },
    splitLine: { lineStyle: { color: grid } },
  };
  const years = report.profit.years;
  return {
    tax: {
      ...base,
      legend: { textStyle: { color: text }, top: 4 },
      xAxis: { ...axis, type: "category", data: ["首年现金缴税口径"] },
      yAxis: { ...axis, type: "value", name: "人民币 / 万元" },
      series: [
        {
          name: "内地 VAT + 附加 + 所得税",
          type: "bar",
          barMaxWidth: 52,
          itemStyle: { color: blue, borderRadius: [4, 4, 0, 0] },
          data: [Number((years[0].mainland.totalTaxCny / 10000).toFixed(2))],
        },
        {
          name: "香港利得税",
          type: "bar",
          barMaxWidth: 52,
          itemStyle: { color: teal, borderRadius: [4, 4, 0, 0] },
          data: [Number((years[0].hkTax.cny / 10000).toFixed(2))],
        },
      ],
    },
    profit: {
      ...base,
      legend: { textStyle: { color: text }, top: 4 },
      xAxis: {
        ...axis,
        type: "category",
        boundaryGap: false,
        data: years.map((y) => `第 ${y.year} 年`),
      },
      yAxis: { ...axis, type: "value", name: "净利润 / 人民币万元" },
      series: [
        {
          name: "香港基础情景（无确认资助）",
          type: "line",
          smooth: false,
          symbolSize: 8,
          itemStyle: { color: blue },
          areaStyle: { color: blue, opacity: 0.07 },
          data: years.map((y) => Number((y.net.cny / 10000).toFixed(2))),
        },
        {
          name: "资助备选上界（待核验）",
          type: "line",
          lineStyle: { type: "dashed" },
          itemStyle: { color: gold },
          data: years.map((y) =>
            Number(
              (
                (y.net.cny +
                  (y.year === 2 ? report.alternative.potentialGrant.cny : 0)) /
                10000
              ).toFixed(2),
            ),
          ),
        },
      ],
    },
    risk: {
      animation: false,
      tooltip: { confine: true },
      radar: {
        center: ["50%", "52%"],
        radius: "62%",
        indicator: report.risk.items.map((i) => ({ name: i.name, max: 100 })),
        axisName: { color: text },
        splitLine: { lineStyle: { color: grid } },
        splitArea: { areaStyle: { color: ["transparent"] } },
        axisLine: { lineStyle: { color: grid } },
      },
      series: [
        {
          type: "radar",
          data: [
            {
              name: "风险得分（越高风险越高）",
              value: report.risk.items.map((i) => i.score),
              lineStyle: { color: teal, width: 2 },
              itemStyle: { color: teal },
              areaStyle: { color: teal, opacity: 0.12 },
            },
          ],
        },
      ],
    },
  };
}

export function scenarioOption(reports, dark = false) {
  const text = dark ? "#d8e2ef" : "#526176";
  return {
    animation: false,
    tooltip: { trigger: "axis", confine: true },
    legend: { textStyle: { color: text } },
    grid: { left: 65, right: 58, top: 50, bottom: 45 },
    xAxis: {
      type: "category",
      data: reports.map((r, i) => (i === 0 ? "基准方案" : `情景 ${i}`)),
      axisLabel: { color: text },
    },
    yAxis: [
      {
        type: "value",
        name: "三年净利润 / 万元",
        axisLabel: { color: text },
        splitLine: { lineStyle: { color: dark ? "#2c3b51" : "#e9eef3" } },
      },
      {
        type: "value",
        min: 0,
        max: 100,
        name: "风险分",
        axisLabel: { color: text },
      },
    ],
    series: [
      {
        name: "三年净利润",
        type: "bar",
        itemStyle: { color: "#407de9" },
        barMaxWidth: 42,
        data: reports.map(
          (r) => +(r.profit.cumulativeNet.cny / 10000).toFixed(2),
        ),
      },
      {
        name: "风险分",
        type: "line",
        yAxisIndex: 1,
        itemStyle: { color: "#c99b49" },
        data: reports.map((r) => r.risk.score),
      },
    ],
  };
}
