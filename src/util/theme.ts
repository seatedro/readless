export function setTheme() {
  if (
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  ) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

// Watch for theme changes
window
  .matchMedia("(prefers-color-scheme: dark)")
  .addEventListener("change", setTheme);
