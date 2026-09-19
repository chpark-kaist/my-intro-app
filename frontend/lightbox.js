// 사진/영상 라이트박스: window.openLightbox(items, startIndex)
// items = [{ type: "img" | "vid", src, poster?, alt }]
(() => {
  "use strict";
  let items = [];
  let index = 0;
  let root, fig, count, btnClose, btnPrev, btnNext, lastFocus;

  function build() {
    root = document.createElement("div");
    root.className = "lightbox";
    root.hidden = true;
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-label", "사진 크게 보기");
    root.innerHTML =
      '<button class="lb-close" type="button" aria-label="닫기">✕</button>' +
      '<button class="lb-prev" type="button" aria-label="이전">‹</button>' +
      '<figure class="lb-fig"></figure>' +
      '<button class="lb-next" type="button" aria-label="다음">›</button>' +
      '<p class="lb-count" aria-live="polite"></p>';
    document.body.appendChild(root);
    fig = root.querySelector(".lb-fig");
    count = root.querySelector(".lb-count");
    btnClose = root.querySelector(".lb-close");
    btnPrev = root.querySelector(".lb-prev");
    btnNext = root.querySelector(".lb-next");

    btnClose.addEventListener("click", close);
    btnPrev.addEventListener("click", () => go(-1));
    btnNext.addEventListener("click", () => go(1));
    root.addEventListener("click", (e) => { if (e.target === root) close(); });
    document.addEventListener("keydown", (e) => {
      if (root.hidden) return;
      if (e.key === "Escape") { e.stopPropagation(); close(); }
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "Tab") {
        const f = [btnClose, btnPrev, btnNext].filter((b) => !b.hidden);
        const i = f.indexOf(document.activeElement);
        e.preventDefault();
        f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
      }
    }, true);

    // 터치 스와이프
    let sx = null;
    root.addEventListener("touchstart", (e) => { sx = e.touches[0].clientX; }, { passive: true });
    root.addEventListener("touchend", (e) => {
      if (sx === null) return;
      const dx = e.changedTouches[0].clientX - sx;
      sx = null;
      if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
    });
  }

  function show() {
    const it = items[index];
    fig.textContent = "";
    let el;
    if (it.type === "vid") {
      el = document.createElement("video");
      el.src = it.src;
      if (it.poster) el.poster = it.poster;
      el.controls = true;
      el.autoplay = true;
      el.loop = true;
      el.muted = true;
      el.playsInline = true;
    } else {
      el = document.createElement("img");
      el.src = it.src;
      el.alt = it.alt || "";
    }
    const cap = document.createElement("figcaption");
    cap.textContent = it.alt || "";
    fig.append(el, cap);
    count.textContent = `${index + 1} / ${items.length}`;
    const many = items.length > 1;
    btnPrev.hidden = btnNext.hidden = !many;
  }

  function go(d) {
    index = (index + d + items.length) % items.length;
    show();
  }

  function close() {
    root.hidden = true;
    fig.textContent = ""; // 영상 정지
    document.documentElement.style.overflow = "";
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  window.openLightbox = (list, start = 0) => {
    if (!list || !list.length) return;
    if (!root) build();
    items = list;
    index = Math.max(0, Math.min(start, list.length - 1));
    lastFocus = document.activeElement;
    root.hidden = false;
    document.documentElement.style.overflow = "hidden";
    show();
    btnClose.focus();
  };
})();
