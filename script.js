const scrollTrack = document.querySelector(".scroll-track");
const body = document.body;
const themeBtn = document.getElementById("themeBtn");

// Переключение тем
// data-theme изначально задаётся на <html>, поэтому читаем/пишем именно туда
// (раньше атрибут ошибочно читался с <body>, где его не было, из-за чего
// первый клик по кнопке не менял тему)
const root = document.documentElement;

themeBtn.addEventListener("click", () => {
  const currentTheme = root.getAttribute("data-theme");
  const newTheme = currentTheme === "dark" ? "light" : "dark";
  root.setAttribute("data-theme", newTheme);
  themeBtn.textContent = newTheme === "dark" ? "☀️ Light" : "🌙 Dark";
});

// trackHeight не меняется от скролла — только от размеров страницы.
// Кэшируем и обновляем только при ресайзе, а не на каждом кадре
// скролла/клика (offsetHeight-чтение форсирует layout).
let trackHeight = scrollTrack.offsetHeight - window.innerHeight;
function recalcTrackHeight() {
  trackHeight = scrollTrack.offsetHeight - window.innerHeight;
}

// Пункты меню (Ingredients / Benefits / About) должны прыгать не на
// начало .scroll-track (это единственное, что умеет обычный якорь
// <a href="#...">, так как все "шаги" — это просто разные scroll-
// прогрессы внутри одного sticky-блока, а не отдельные элементы в
// потоке документа), а на конкретный шаг сценария. Поэтому вместо
// href считаем нужный scrollTop из доли прогресса (data-scroll-progress).
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

  let scrollProgress = scrollTop / trackHeight;
  scrollProgress = Math.max(0, Math.min(1, scrollProgress));

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
    // Тяжёлый пересчёт (клон DOM руки + forced reflow) нужен только
    // в момент ПЕРЕХОДА в состояние, а не на каждом кадре скролла
    // внутри него — раньше это гоняло клонирование ноды на каждый
    // scroll-тик, даже если рука уже стоит на месте.
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

// --- Шаг 4: банка "приклеена" к руке при любой ширине окна ---
// Раньше банка позиционировалась вручную через vw/vh + фиксированный
// margin-top, а рука — через свою отдельную vw-формулу. При изменении
// ширины окна они масштабировались с разной скоростью и расходились.
// Вместо подбора магических чисел теперь берём РЕАЛЬНЫЕ координаты
// руки (getBoundingClientRect) и ставим банку строго относительно них —
// так расхождение невозможно в принципе, при любой ширине окна.
const productContainer = document.querySelector(".product-container");
const handLayer = document.querySelector(".hand-layer");

// Точка на ладони, где должно стоять донышко банки, — в долях от
// размера картинки руки (0 = левый/верхний край, 1 = правый/нижний).
// Подобрано по реальному hand.png (силуэт руки очень вытянутый,
// ~3.9:1), измерено по альфа-каналу — X это горизонтальный центр
// банки, Y это линия "поверхности" ладони, на которую садится низ
// банки (не центр банки, а именно её нижний край).
const JAR_DOCK_X = 0.33; // по горизонтали от левого края руки
const JAR_DOCK_Y = 0.31; // линия ладони, куда садится донышко банки
const JAR_SIZE_RATIO = 0.5; // диаметр контейнера банки относительно ширины руки
// В самой картинке closeCap.png банка не занимает весь квадратный
// холст: сверху ~34% пустого места, снизу ~16% (измерено по альфа-
// каналу). Если выравнивать по нижнему краю КОНТЕЙНЕРА, банка
// будет "висеть" над ладонью на величину этого нижнего отступа —
// поэтому учитываем его при расчёте.
const JAR_BOTTOM_PADDING = 0.161;

// Читает КОНЕЧные координаты руки на 4-м шаге, а не текущие.
// .hand-layer въезжает по 1.2s css-transition; если просто вызвать
// getBoundingClientRect() сразу после смены класса на "state-3",
// браузер ещё не успел ничего анимировать и вернёт СТАРОЕ (скрытое)
// положение — из-за этого баночка на первом скролле пропадала и
// "допрыгивала" только на следующем. Чтобы получить точную целевую
// геометрию сразу, меряем невидимый клон руки с отключенным
// transition — он мгновенно принимает конечные стили, не трогая
// анимацию настоящей руки на экране.
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
  // Банка должна СТОЯТЬ на поверхности ладони — выравниваем по
  // видимому низу самой банки (с поправкой на прозрачный отступ
  // внутри closeCap.png), а не по низу квадратного контейнера.
  const targetCenterY = targetSurfaceY - jarSize * (0.5 - JAR_BOTTOM_PADDING);

  // Естественный центр .product-container — центр вьюпорта, т.к. он
  // центрируется flex-контейнером .sticky-viewport, если убрать
  // старые transform/margin-top.
  const naturalCenterX = window.innerWidth / 2;
  const naturalCenterY = window.innerHeight / 2;

  const dx = targetCenterX - naturalCenterX;
  const dy = targetCenterY - naturalCenterY;

  if (instant) {
    // При ресайзе двигаем банку мгновенно, без css-transition,
    // иначе она будет "отставать" от руки во время перетаскивания
    // края окна.
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

// При изменении размера окна (в т.ч. открытие/закрытие боковых
// панелей браузера, поворот устройства) пересчитываем позицию банки,
// если сейчас активен 4-й шаг.
let resizeTicking = false;
window.addEventListener("resize", () => {
  if (!resizeTicking) {
    window.requestAnimationFrame(() => {
      recalcTrackHeight();
      syncJarToHand(true);
      resizeTicking = false;
    });
    resizeTicking = true;
  }
});
