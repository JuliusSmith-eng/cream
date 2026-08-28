const scrollTrack = document.querySelector(".scroll-track");
const body = document.body;
const themeBtn = document.getElementById("themeBtn");

// Переключение тем

const root = document.documentElement;

themeBtn.addEventListener("click", () => {
  const currentTheme = root.getAttribute("data-theme");
  const newTheme = currentTheme === "dark" ? "light" : "dark";
  root.setAttribute("data-theme", newTheme);
  themeBtn.textContent = newTheme === "dark" ? "☀️ Light" : "🌙 Dark";
});

let trackHeight = scrollTrack.offsetHeight - window.innerHeight;
function recalcTrackHeight() {
  trackHeight = scrollTrack.offsetHeight - window.innerHeight;
}

document.querySelectorAll("[data-scroll-progress]").forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    const progress = parseFloat(link.dataset.scrollProgress);
    window.scrollTo({
      top: trackHeight * progress,
      behavior: "smooth",
    });
  });
});

// Логика скролл-анимации на 4 шага (0, 1, 2, 3)
let ticking = false;
let prevState = "";

function updateScrollState() {
  const scrollTop = window.scrollY;

  if (trackHeight <= 0) {
    ticking = false;
    return;
  }

  const rawProgress = scrollTop / trackHeight;

  if (rawProgress > 1) {
    prevState = "";
    ticking = false;
    return;
  }

  const scrollProgress = Math.max(0, rawProgress);

  // Делим скролл на 4 интервала
  let state;
  if (scrollProgress < 0.25) {
    state = "state-0";
  } else if (scrollProgress < 0.55) {
    state = "state-1";
  } else if (scrollProgress < 0.8) {
    state = "state-2";
  } else {
    state = "state-3";
  }

  if (state !== prevState) {
    body.className = state;

    if (state === "state-3") {
      syncJarToHand(false);
    } else if (prevState === "state-3") {
      clearJarOverride();
    }
    prevState = state;
  }

  ticking = false;
}

window.addEventListener("scroll", () => {
  if (!ticking) {
    window.requestAnimationFrame(updateScrollState);
    ticking = true;
  }
});

const productContainer = document.querySelector(".product-container");
const handLayer = document.querySelector(".hand-layer");

const JAR_DOCK_X = 0.33;
const JAR_DOCK_Y = 0.31;
const JAR_SIZE_RATIO = 0.5;

const JAR_BOTTOM_PADDING = 0.161;

function getFinalHandRect() {
  const clone = handLayer.cloneNode(true);
  clone.style.transition = "none";
  clone.style.visibility = "hidden";
  clone.style.pointerEvents = "none";
  handLayer.parentNode.appendChild(clone);
  const rect = clone.getBoundingClientRect();
  clone.remove();
  return rect;
}

function syncJarToHand(instant) {
  if (!productContainer || !handLayer) return;
  if (!body.classList.contains("state-3")) return;

  const handRect = getFinalHandRect();
  if (!handRect.width) return;

  const jarSize = handRect.width * JAR_SIZE_RATIO;
  const targetCenterX = handRect.left + handRect.width * JAR_DOCK_X;
  const targetSurfaceY = handRect.top + handRect.height * JAR_DOCK_Y;

  const targetCenterY = targetSurfaceY - jarSize * (0.5 - JAR_BOTTOM_PADDING);

  const naturalCenterX = window.innerWidth / 2;
  const naturalCenterY = window.innerHeight / 2;

  const dx = targetCenterX - naturalCenterX;
  const dy = targetCenterY - naturalCenterY;

  if (instant) {
    productContainer.style.transition = "none";
  } else {
    productContainer.style.transition = "";
  }

  productContainer.style.width = jarSize + "px";
  productContainer.style.height = jarSize + "px";
  productContainer.style.marginTop = "0px";
  productContainer.style.transform = `translate(${dx}px, ${dy}px)`;

  if (instant) {
    // форсируем применение стилей без анимации, затем возвращаем
    // transition на место для следующих переходов между шагами
    void productContainer.offsetWidth;
    requestAnimationFrame(() => {
      productContainer.style.transition = "";
    });
  }
}

function clearJarOverride() {
  if (!productContainer) return;
  productContainer.style.width = "";
  productContainer.style.height = "";
  productContainer.style.marginTop = "";
  productContainer.style.transform = "";
}

let resizeTicking = false;
window.addEventListener("resize", () => {
  if (!resizeTicking) {
    window.requestAnimationFrame(() => {
      recalcTrackHeight();
      if (window.scrollY <= trackHeight) {
        syncJarToHand(true);
      }
      resizeTicking = false;
    });
    resizeTicking = true;
  }
});
