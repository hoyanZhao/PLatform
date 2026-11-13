import { context, dual } from "./common.js";

export function talentModel(input, config) {
  const { industry: i, size, a, fx } = context(input, config);
  // 规模映射为人员基线；投资覆盖能力决定新增岗位建议，保留至少一个合规职责。
  const budgetCapacity = Math.floor(
    (input.investmentCny * fx * 0.3) / a.payrollPerEmployeeHkd,
  );
  const total = Math.max(
    3,
    Math.min(size.employees, Math.max(3, budgetCapacity)),
  );
  const technical = Math.max(1, Math.floor(total * i.techShare));
  const business = Math.max(1, Math.floor(total * i.businessShare));
  const compliance = Math.max(1, total - technical - business);
  const roles = [
    { id: "technical", name: "技术岗", count: technical },
    { id: "business", name: "商务岗", count: business },
    { id: "compliance", name: "合规职责岗", count: compliance },
  ];
  const actualTotal = roles.reduce((n, r) => n + r.count, 0);
  return {
    roles,
    total: actualTotal,
    payrollBaseEmployees: size.employees,
    note: "岗位建议用投资额 30% 作为首年招聘预算参考，并受规模映射人数上限约束；与盈利模型的完整规模人工基线分别展示。合规可外聘，但成本须重新核实。",
    potentialTalentSupport: {
      status: "待核验",
      claimableHkd: null,
      simulatedBudget: dual(
        Math.min(
          a.potentialTalentBudgetCapHkd,
          technical * a.potentialTalentBudgetPerTechHkd,
        ),
        fx,
      ),
      note: "此数值仅为企业人才支持预算敏感性假设，不是官方津贴率，不计入基础利润，也不与 ESS 相加以避免重复资助。",
    },
    visas: [
      "高才通：核验个人前一年收入，或合资格大学学位、工作经验与毕业年限等所属类别；企业投资不等于个人资格。",
      "优才计划：按入境处现行机制核验个人学历、语言、经验及其他要求，五字段无法判断。",
      "科技人才入境计划：核验企业与个人是否满足当期适用条件、配额及研发职责要求。",
    ],
    checklist: [
      "个人身份证明与有效旅行证件",
      "学历、成绩及第三方认证（按具体计划要求）",
      "收入、工作经验与雇佣文件（按类别）",
      "企业研发活动、配额与岗位说明（如适用）",
      "核对当期官方申请指南、费用及续签条件",
    ],
    resources: config.resources.filter((r) =>
      roles.some((p) => p.id === r.role && p.count > 0),
    ),
  };
}
