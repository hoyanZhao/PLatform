import { accounts, saveAccounts, session, setSession } from "./storage.js";
const normalized = (value) =>
  value.trim().normalize("NFKC").toLocaleLowerCase("zh-CN");
async function digest(password, salt) {
  if (!crypto.subtle)
    throw new Error(
      "密码散列需要安全上下文，请通过 localhost 或 HTTPS 打开网站。",
    );
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${salt}:${password}`),
  );
  return Array.from(new Uint8Array(bytes), (x) =>
    x.toString(16).padStart(2, "0"),
  ).join("");
}
export function currentUser() {
  const saved = session();
  return saved ? (accounts().find((x) => x.id === saved.id) ?? null) : null;
}
export async function authenticate(mode, username, password, confirm) {
  const errors = {},
    name = username.trim().normalize("NFKC"),
    key = normalized(username);
  const all = accounts(),
    existing = all.find((x) => x.key === key);
  if (!name || name.length > 32 || /[\u0000-\u001f<>]/.test(name))
    errors.username = "请输入 1–32 字的有效用户名";
  if (password.length < 6 || password.length > 128)
    errors.password = "密码长度须为 6–128 位";
  if (mode === "register") {
    if (existing) errors.username = "该用户名已注册";
    if (confirm !== password) errors.confirm = "两次输入的密码不一致";
  } else if (!existing) errors.username = "用户名不存在";
  if (Object.keys(errors).length) return { errors };
  if (
    mode === "login" &&
    (await digest(password, existing.salt)) !== existing.hash
  )
    return { errors: { password: "密码不正确" } };
  let user = existing;
  if (mode === "register") {
    const salt = Array.from(crypto.getRandomValues(new Uint8Array(16)), (x) =>
      x.toString(16).padStart(2, "0"),
    ).join("");
    user = {
      id: crypto.randomUUID(),
      key,
      name,
      salt,
      hash: await digest(password, salt),
    };
    saveAccounts([...all, user]);
  }
  setSession({ id: user.id });
  return { user };
}
export function logout() {
  setSession(null);
}
