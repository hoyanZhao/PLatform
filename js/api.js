export async function api(path, body) {
  const response = await fetch(
    `/api${path}`,
    body === undefined
      ? { cache: "no-store" }
      : {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
  );
  if (!response.ok) {
    const result = await response
      .json()
      .catch(() => ({ error: "服务器响应异常" }));
    const error = new Error(result.error || "请求失败");
    error.fields = result.fields;
    throw error;
  }
  const type = response.headers.get("content-type") || "";
  return type.includes("json")
    ? response.json()
    : type.includes("pdf")
      ? response.blob()
      : response.text();
}
