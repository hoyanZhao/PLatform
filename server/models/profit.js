import { money, dual, hkTax, sum, context } from "./common.js";

/**
 * 固定演示模型：营收为不含税收入，行业 grossMargin 扣除直接采购但尚未扣人工/办公。
 * 内地 VAT = 销项税 × (1 - 演示进项抵扣比例)，不是企业利润税；附加按净 VAT 计算。
 * 附加进入内地所得税前费用；VAT 单独作为现金缴税口径，不重复从净利润扣除。
 * 对比只是两地相同收入规模下的税款情景，不是把同一交易同时按两地税法计税。
 */
export function profitModel(input, config, scenario) {
  const { industry: i, park, a, size, fx } = context(input, config);
  const tax = config.rules.official.hkProfitsTax;
  const investedHkd = money(input.investmentCny * fx);
  const fitout = money(investedHkd * a.fitoutFraction);
  const delayFactor = (1 + a.delayAnnualCostInflation) ** scenario.delayYears;
  const employees = size.employees;
  const office = money(park.officeAnnualHkd * Math.max(1, employees / 10));
  const payroll = money(employees * a.payrollPerEmployeeHkd);
  const years = [];
  for (let y = 1; y <= 3; y++) {
    const revenueHkd = money(input.revenueCny * fx * (1 + i.growth) ** (y - 1));
    const directCostHkd = money(revenueHkd * (1 - i.grossMargin));
    const costFactor = delayFactor * (1 + a.hkCostInflation) ** (y - 1);
    const payrollHkd = money(payroll * costFactor);
    const officeHkd = money(office * costFactor);
    const complianceHkd = money(a.annualComplianceHkd * costFactor);
    const registrationHkd =
      y === 1 ? money(a.registrationHkd * delayFactor) : 0;
    // 装修预算为投资内部配置，以三年直线折旧计入利润；不再把全部投资作为费用扣一次。
    const depreciationHkd = money(fitout / 3);
    const hkPreTaxHkd = money(
      revenueHkd -
        directCostHkd -
        payrollHkd -
        officeHkd -
        complianceHkd -
        registrationHkd -
        depreciationHkd,
    );
    const hkTaxHkd = hkTax(hkPreTaxHkd, tax, tax.eligibleConfirmed);
    const hkTwoTierTaxHkd = hkTax(hkPreTaxHkd, tax, true);
    const netHkd = money(hkPreTaxHkd - hkTaxHkd);
    const revenueCny = money(revenueHkd / fx);
    const vatCny = money(revenueCny * i.vat * (1 - i.inputCreditFraction));
    const surchargeCny = money(vatCny * a.surchargeOnVat);
    const mainlandCostCny = money(
      directCostHkd / fx +
        (payrollHkd / fx) * a.mainlandPayrollFactor +
        (officeHkd / fx) * a.mainlandOfficeFactor +
        a.mainlandAnnualComplianceCny * costFactor +
        (y === 1 ? a.mainlandSetupCny * delayFactor : 0) +
        (input.investmentCny * a.mainlandFitoutFraction) / 3,
    );
    const mainlandPreTaxCny = money(
      revenueCny - mainlandCostCny - surchargeCny,
    );
    const mainlandCitCny = money(
      Math.max(0, mainlandPreTaxCny) * a.mainlandCit,
    );
    const mainlandTotalTaxCny = sum([vatCny, surchargeCny, mainlandCitCny]);
    const hkNetCny = money(netHkd / fx);
    years.push({
      year: y,
      revenue: dual(revenueHkd, fx),
      directCost: dual(directCostHkd, fx),
      payroll: dual(payrollHkd, fx),
      office: dual(officeHkd, fx),
      compliance: dual(complianceHkd, fx),
      registration: dual(registrationHkd, fx),
      depreciation: dual(depreciationHkd, fx),
      preTax: dual(hkPreTaxHkd, fx),
      hkTax: dual(hkTaxHkd, fx),
      net: dual(netHkd, fx),
      operatingCash: dual(netHkd + depreciationHkd, fx),
      confirmedSubsidy: dual(0, fx),
      mainland: {
        revenueCny,
        costCny: mainlandCostCny,
        vatCny,
        surchargeCny,
        citCny: mainlandCitCny,
        totalTaxCny: mainlandTotalTaxCny,
        preTaxCny: mainlandPreTaxCny,
        netCny: money(mainlandPreTaxCny - mainlandCitCny),
      },
      taxDifference: {
        cny: money(mainlandTotalTaxCny - hkTaxHkd / fx),
        hkd: money(mainlandTotalTaxCny * fx - hkTaxHkd),
      },
      incomeTaxOnlyDifferenceCny: money(mainlandCitCny - hkTaxHkd / fx),
      possibleTwoTierSaving: dual(hkTaxHkd - hkTwoTierTaxHkd, fx),
      hkNetCny,
    });
  }
  const total = sum(years.map((y) => y.net.hkd));
  const cumulativeNet = dual(total, fx);
  const roi = money((cumulativeNet.cny / input.investmentCny) * 100) / 100;
  const cumulative = [];
  years.reduce((v, y) => {
    const n = money(v + y.net.cny);
    cumulative.push(n);
    return n;
  }, 0);
  const paybackYear = cumulative.findIndex((v) => v >= input.investmentCny);
  return {
    years,
    employees,
    scaleMapping: `${size.label}：${size.range}，演算采用 ${employees} 人`,
    investment: dual(investedHkd, fx),
    fitoutBudget: dual(fitout, fx),
    firstYearOperatingExpense: dual(
      years[0].registration.hkd +
        years[0].compliance.hkd +
        years[0].office.hkd +
        years[0].payroll.hkd,
      fx,
    ),
    cumulativeNet,
    roi,
    cumulativeCny: cumulative,
    budgetRecoveryYear: paybackYear < 0 ? null : paybackYear + 1,
    confirmedSubsidy: dual(0, fx),
    taxBasis: tax.eligibleConfirmed
      ? "已人工确认两级制资格"
      : "资格未确认，基础情景按公司标准税率 16.5%；两级制节税列为备选",
    caveats: [
      "京津冀一般工商业演示：增值税、企业所得税及按实缴增值税计的附加；不含地方临时优惠。行业税率与进项抵扣比例为简化假设，不覆盖混合销售、出口退税或特殊纳税人。",
      "增值税是现金缴税口径，与企业所得税经济性质不同；综合差额不是承诺节税额，跨境原有纳税义务不会因香港注册自动消失。",
      "未自动应用离岸免税、小型微利企业优惠、亏损结转、资本性支出税务调整、暂缴税、转让定价或税收抵免。模型利润仅为应评税利润代理值。",
      "计划投资为预算及回报率分母，不再整笔扣减经营利润；装修预算三年直线折旧。预算回收年仅为累计利润覆盖预算的演示指标。",
      "第二年已确认资助为 0；所有待核验资助仅在备选情景展示，不自动提高基础盈利。",
      "延迟落地仅上调成本，不推定未来政策有效，也不计等待期间利润与资金时间价值。",
    ],
  };
}
