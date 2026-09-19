// 소개 페이지 효과: 통계 카운트업, 히어로 패럴랙스, 스크롤 등장, 카드 틸트, 영상 자동 재생, 관심사 카드
(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;

  const trips = window.TRIPS || [];
  const interests = window.INTERESTS || {};

  // ---------- 통계 (데이터에서 계산) ----------
  const srcs = new Set();
  trips.forEach((t) => t.media.forEach((m) => srcs.add(m.src)));
  Object.values(interests).forEach((x) => x.media.forEach((m) => srcs.add(m.src)));
  const years = trips.map((t) => t.year);
  const stats = {
    countries: new Set(trips.map((t) => t.country)).size,
    places: trips.length,
    media: srcs.size,
  };

  function countUp(el, to) {
    if (reduce) { el.textContent = to; return; }
    const t0 = performance.now(), dur = 1500;
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  $$("[data-stat]").forEach((el) => {
    const key = el.dataset.stat;
    if (key === "span") { el.textContent = years.length ? `${Math.min(...years)}–${Math.max(...years)}` : "–"; return; }
    setTimeout(() => countUp(el, stats[key] || 0), 700);
  });

  // ---------- 헤더 상태 + 히어로 패럴랙스 ----------
  const header = $(".site-header");
  const hero = $(".hero");
  const heroBg = $(".hero-bg");
  const heroInner = $(".hero-inner");
  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      const y = window.scrollY, h = hero.offsetHeight;
      header.classList.toggle("scrolled", y > h - 90);
      if (!reduce && y < h * 1.2) {
        heroBg.style.transform = `translate3d(0, ${(y * 0.3).toFixed(1)}px, 0) scale(${(1.06 + (y / h) * 0.06).toFixed(3)})`;
        heroInner.style.opacity = String(Math.max(0, 1 - y / (h * 0.75)));
      }
    });
  }
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // ---------- 스크롤 등장 ----------
  const revealIO = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) { e.target.classList.add("in"); revealIO.unobserve(e.target); }
    }
  }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
  $$(".reveal").forEach((el, i) => {
    // 같은 줄의 카드가 차례로 나타나도록 약간의 지연
    if (el.classList.contains("move-card")) el.style.setProperty("--d", `${(i % 3) * 0.12}s`);
    revealIO.observe(el);
  });

  // ---------- 카드 틸트 (마우스 위치에 따라 기울어짐) ----------
  if (finePointer && !reduce) {
    $$(".tilt").forEach((el) => {
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        el.style.setProperty("--ry", `${((x - 0.5) * 9).toFixed(2)}deg`);
        el.style.setProperty("--rx", `${((0.5 - y) * 9).toFixed(2)}deg`);
        el.style.setProperty("--mx", `${(x * 100).toFixed(1)}%`);
        el.style.setProperty("--my", `${(y * 100).toFixed(1)}%`);
      });
      el.addEventListener("pointerleave", () => {
        el.style.setProperty("--rx", "0deg");
        el.style.setProperty("--ry", "0deg");
      });
    });
  }

  // ---------- 관심사 카드 영상: 화면에 보일 때만 로드·재생 ----------
  if (!reduce) {
    const vio = new IntersectionObserver((entries) => {
      for (const e of entries) {
        const v = e.target;
        if (e.isIntersecting) {
          if (!v.getAttribute("src") && v.dataset.src) v.src = v.dataset.src;
          v.play().catch(() => {});
        } else {
          v.pause();
        }
      }
    }, { threshold: 0.25 });
    $$("video[data-autoplay]").forEach((v) => vio.observe(v));
  }

  // ---------- 관심사 카드 → 라이트박스 ----------
  $$(".move-card").forEach((card) => {
    card.addEventListener("click", () => {
      const list = interests[card.dataset.interest];
      if (list && window.openLightbox) window.openLightbox(list.media, 0);
    });
  });

  // ---------- 상단 메뉴: 현재 섹션 표시 ----------
  const links = $$('.site-header nav a[href^="#"]');
  const map = new Map(links.map((a) => [a.getAttribute("href").slice(1), a]));
  const secIO = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const a = map.get(e.target.id);
      if (a && e.isIntersecting) { links.forEach((l) => l.classList.remove("active")); a.classList.add("active"); }
    }
  }, { rootMargin: "-45% 0px -50% 0px" });
  $$("main section[id]").forEach((s) => secIO.observe(s));
})();
