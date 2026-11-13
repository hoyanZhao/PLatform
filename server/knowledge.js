import { snapshot } from "./config.js";

/** 本地可解释检索，没有在线生成服务；不根据提问自动作资格保证。 */
export function answerQuestion(question) {
  if (typeof question !== "string" || !question.trim() || question.length > 500)
    return { error: "请输入 1–500 字的问题" };
  const text = question.toLowerCase();
  const matches = snapshot.policies
    .map((p) => ({
      policy: p,
      score: p.keywords.reduce(
        (n, key) => n + (text.includes(key.toLowerCase()) ? key.length : 0),
        0,
      ),
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((x) => x.policy);
  if (!matches.length)
    return {
      answer:
        "本地政策库没有足够依据回答这个问题。请改用利得税、ESS 科创资助、高才通、优才、科技人才、跨境资金或公司年审等关键词；具体资格请核对主管部门原文。",
      sources: [],
      mode: "本地检索与模板回答",
    };
  return {
    answer:
      matches.map((p) => `${p.title}：${p.summary}`).join("\n\n") +
      "\n\n仅凭企业五项输入不能确认申请人或企业符合资格。请补充计划要求的资质证明并向主管部门复核。",
    sources: matches.map((p) => ({
      title: p.title,
      url: p.url,
      checkedAt: p.checkedAt,
    })),
    mode: "本地检索与模板回答",
  };
}
