const scrollTrack = document.querySelector(".scroll-track");
const body = document.body;
const themeBtn = document.getElementById("themeBtn");

// Переключение тем
themeBtn.addEventListener("click", () => {
  const currentTheme = body.getAttribute("data-theme");
  const newTheme = currentTheme === "dark" ? "light" : "dark";
  body.setAttribute("data-theme", newTheme);
  themeBtn.textContent = newTheme === "dark" ? "☀️ Light" : "🌙 Dark";
});

// Логика скролл-анимации на 4 шага (0, 1, 2, 3)
window.addEventListener("scroll", () => {
  const scrollTop = window.scrollY;
  const trackHeight = scrollTrack.offsetHeight - window.innerHeight;

  if (trackHeight <= 0) return;

  let scrollProgress = scrollTop / trackHeight;
  scrollProgress = Math.max(0, Math.min(1, scrollProgress));

  // Делим скролл на 4 равных интервала (по 25%)
  if (scrollProgress < 0.25) {
    body.className = "state-0";
  } else if (scrollProgress < 0.55) {
    body.className = "state-1";
  } else if (scrollProgress < 0.8) {
    body.className = "state-2";
  } else {
    body.className = "state-3";
  }
});
