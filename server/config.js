import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

export const ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const load = (name) =>
  JSON.parse(readFileSync(path.join(ROOT, "data", `${name}.json`), "utf8"));
// 唯一模型数据入口：只读取本地文件。严禁导入新闻缓存或网络抓取服务。
export const snapshot = Object.freeze({
  rules: load("rules"),
  industries: load("industries"),
  parks: load("parks"),
  policies: load("policies"),
  cases: load("cases"),
  resources: load("talent-resources"),
});
export const newsSources = load("news-sources");
