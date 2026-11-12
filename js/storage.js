const ACCOUNTS = "hk-accounts-v1";
const SESSION = "hk-demo-session-v1";
function get(key, fallback) {
  const raw = localStorage.getItem(key);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("浏览器本地数据损坏，请先备份重要报告后检查站点存储。");
  }
}
function put(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    throw new Error(
      "本地存储不可用或空间不足。请导出重要报告后释放浏览器站点空间。",
    );
  }
}
export const accounts = () => get(ACCOUNTS, []);
export const saveAccounts = (value) => put(ACCOUNTS, value);
export const session = () => get(SESSION, null);
export const setSession = (value) =>
  value ? put(SESSION, value) : localStorage.removeItem(SESSION);
export const defaultUserData = () => ({
  current: null,
  projects: [],
  scenarios: [],
  tasks: {},
  consultations: [],
  seenNews: [],
});
// namespace 用注册时生成的账号 ID，不能被用户名中的分隔符污染；仅提供本机隔离，不是鉴权。
export const loadUser = (id) => ({
  ...defaultUserData(),
  ...get(`hk-user-v1:${id}`, {}),
});
export const saveUser = (id, value) => put(`hk-user-v1:${id}`, value);
