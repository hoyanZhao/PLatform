/** 默认启用 Chromium 自身的沙箱；仅受限自动化测试显式选择单进程模式。 */
export function browserOptions() {
  return {
    headless: "shell",
    executablePath: process.env.CHROME_PATH || undefined,
    args:
      process.env.BROWSER_TEST_SINGLE_PROCESS === "1"
        ? [
            "--no-sandbox",
            "--single-process",
            "--in-process-gpu",
            "--disable-gpu",
            "--no-zygote",
          ]
        : [],
  };
}
