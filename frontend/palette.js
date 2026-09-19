// Ctrl+K (Mac은 ⌘K) 로 여는 빠른 이동 팔레트
(() => {
  "use strict";
  const map = window.TripMap;
  const trips = window.TRIPS || [];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  function goto(hash) {
    const el = document.querySelector(hash);
    if (el) el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }
  function onMap(fn) {
    goto("#map");
    setTimeout(fn, reduce ? 0 : 500);   // 지도까지 스크롤한 뒤 실행
  }

  // 항목: { title, hint(종류), keys(검색어), run }
  function items() {
    const list = [
      { title: "맨 위로", hint: "이동", keys: "top home 처음 위", run: () => goto("#top") },
      { title: "소개", hint: "이동", keys: "about 프로필 인사말", run: () => goto("#about") },
      { title: "나의 지도", hint: "이동", keys: "map 여행 지도", run: () => goto("#map") },
      { title: "관심사", hint: "이동", keys: "러닝 자전거 여행 interests", run: () => goto("#moves") },
      { title: "클라우드 컴퓨팅 실습", hint: "이동", keys: "practice api 실습 연동", run: () => goto("#practice") },
      { title: "연락 · 링크", hint: "이동", keys: "contact 이메일 github 연락", run: () => goto("#links") },
      { title: "이 페이지는 어떻게 만들었나", hint: "이동", keys: "ai claude 만든 과정 기술", run: () => { const d = document.querySelector(".ai-card"); if (d) { d.open = true; goto("#ai"); } } },
    ];
    if (map) {
      trips.forEach((t, i) => list.push({
        title: `${t.place}`, hint: `${t.year} · ${t.country}`,
        keys: `${t.place} ${t.country} ${t.year} ${t.tag} trip`,
        run: () => onMap(() => map.select(i)),
      }));
      list.push(
        { title: "여정 재생", hint: "지도", keys: "play 재생 시작 여행", run: () => onMap(() => map.play()) },
        { title: "전체 보기 / 아시아 보기", hint: "지도", keys: "world 세계 전체 지구", run: () => onMap(() => map.toggleWorld()) },
      );
      if (window.startPostcard) list.push({ title: "엽서 남기기", hint: "지도", keys: "postcard 엽서 방명록 남기기", run: () => onMap(() => window.startPostcard()) });
    }
    list.push(
      { title: "테마 전환 (낮 ↔ 밤)", hint: "동작", keys: "theme dark light 다크 라이트 밤 낮", run: () => document.getElementById("theme-toggle")?.click() },
      { title: "염소 부르기 🐐", hint: "동작", keys: "goat 염소 메에 이스터에그", run: () => window.callGoat && window.callGoat() },
      { title: "연동 실습 페이지", hint: "링크", keys: "api demo 실습 연동 백엔드", run: () => { location.href = "api-demo.html"; } },
      { title: "백엔드 Swagger UI", hint: "링크", keys: "swagger docs api fastapi render", run: () => window.open(`${window.API_BASE}/docs`, "_blank", "noopener") },
      { title: "GitHub 저장소", hint: "링크", keys: "github 소스 코드 repo", run: () => window.open("https://github.com/chpark-kaist/my-intro-app", "_blank", "noopener") },
    );
    return list;
  }

  // ---------- UI ----------
  let root, input, listEl, all = [], shown = [], active = 0, lastFocus;

  function build() {
    root = document.createElement("div");
    root.className = "palette";
    root.hidden = true;
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-label", "빠른 이동");
    root.innerHTML =
      '<div class="pal-box"><input class="pal-input" type="text" placeholder="어디로 갈까요? (예: 몽골, 러닝, 테마, 염소)" aria-label="검색" autocomplete="off" spellcheck="false" />' +
      '<ul class="pal-list" role="listbox"></ul>' +
      '<p class="pal-foot"><span><kbd>↑</kbd><kbd>↓</kbd> 선택</span><span><kbd>Enter</kbd> 실행</span><span><kbd>Esc</kbd> 닫기</span></p></div>';
    document.body.appendChild(root);
    input = root.querySelector(".pal-input");
    listEl = root.querySelector(".pal-list");
    input.addEventListener("input", () => filter(input.value));
    root.addEventListener("mousedown", (e) => { if (e.target === root) close(); });
    listEl.addEventListener("click", (e) => { const li = e.target.closest("li"); if (li) run(Number(li.dataset.i)); });
    listEl.addEventListener("mousemove", (e) => { const li = e.target.closest("li"); if (li && Number(li.dataset.i) !== active) { active = Number(li.dataset.i); paint(); } });
    input.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") { e.preventDefault(); active = (active + 1) % Math.max(1, shown.length); paint(true); }
      else if (e.key === "ArrowUp") { e.preventDefault(); active = (active - 1 + shown.length) % Math.max(1, shown.length); paint(true); }
      else if (e.key === "Enter") { e.preventDefault(); run(active); }
      else if (e.key === "Escape") { e.preventDefault(); close(); }
      else if (e.key === "Tab") { e.preventDefault(); }
    });
  }

  function filter(q) {
    const s = q.trim().toLowerCase();
    if (!s) shown = all.slice(0, 40);
    else {
      const words = s.split(/\s+/);
      shown = all
        .map((it) => {
          const hay = `${it.title} ${it.hint} ${it.keys}`.toLowerCase();
          if (!words.every((w) => hay.includes(w))) return null;
          return { it, score: it.title.toLowerCase().startsWith(words[0]) ? 0 : it.title.toLowerCase().includes(words[0]) ? 1 : 2 };
        })
        .filter(Boolean)
        .sort((a, b) => a.score - b.score)
        .map((x) => x.it);
    }
    active = 0;
    paint();
  }

  function paint(scroll) {
    listEl.textContent = "";
    if (!shown.length) {
      const li = document.createElement("li");
      li.className = "empty";
      li.textContent = "찾는 항목이 없어요. 다른 단어로 검색해 보세요";
      listEl.append(li);
      return;
    }
    shown.forEach((it, i) => {
      const li = document.createElement("li");
      li.dataset.i = i;
      li.setAttribute("role", "option");
      if (i === active) { li.className = "on"; li.setAttribute("aria-selected", "true"); }
      const t = document.createElement("span");
      t.textContent = it.title;
      const h = document.createElement("small");
      h.textContent = it.hint;
      li.append(t, h);
      listEl.append(li);
    });
    if (scroll) listEl.querySelector(".on")?.scrollIntoView({ block: "nearest" });
  }

  function run(i) {
    const it = shown[i];
    if (!it) return;
    close();
    setTimeout(it.run, 60);
  }

  function open() {
    if (!root) build();
    all = items();
    lastFocus = document.activeElement;
    root.hidden = false;
    document.documentElement.style.overflow = "hidden";
    input.value = "";
    filter("");
    input.focus();
  }
  function close() {
    if (!root || root.hidden) return;
    root.hidden = true;
    document.documentElement.style.overflow = "";
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      root && !root.hidden ? close() : open();
    }
  });
  document.getElementById("kbdHint")?.addEventListener("click", open);
  window.openPalette = open;
})();
