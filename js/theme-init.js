try {
  document.documentElement.dataset.theme =
    localStorage.getItem("hk-theme") ||
    (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
} catch {
  document.documentElement.dataset.theme = "light";
}
