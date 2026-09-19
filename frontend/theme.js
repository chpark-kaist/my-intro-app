// 라이트/다크 테마 전환 (모든 페이지 공통)
document.getElementById("theme-toggle").addEventListener("click", () => {
  const root = document.documentElement;
  const isDark =
    root.dataset.theme === "dark" ||
    (!root.dataset.theme && matchMedia("(prefers-color-scheme: dark)").matches);
  root.dataset.theme = isDark ? "light" : "dark";
  try {
    localStorage.setItem("theme", root.dataset.theme);
  } catch (_) {}
});
