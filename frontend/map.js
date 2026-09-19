// 인터랙티브 점 지도: 캔버스로 그린 세계지도 + 핀 + 여정 선 + 카메라 이동 + 상세 패널
(() => {
  "use strict";
  const TRIPS = window.TRIPS;
  const LAND = window.LAND;
  const stage = document.getElementById("mapStage");
  if (!stage || !TRIPS || !LAND) return;

  const cDots = document.getElementById("mapDots");
  const cFx = document.getElementById("mapFx");
  const gD = cDots.getContext("2d");
  const gF = cFx.getContext("2d");
  const pinsEl = stage.querySelector(".pins");
  const panel = document.getElementById("tripPanel");
  const timeline = document.getElementById("timeline");
  const btnPlay = document.getElementById("btnPlay");
  const btnWorld = document.getElementById("btnWorld");
  const hint = document.getElementById("mapHint");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const N = TRIPS.length;
  const TAU = Math.PI * 2;

  // ---------- 육지 격자 (행마다 [시작, 끝) 열 구간) ----------
  const rowsS = [];
  const rowsE = [];
  for (const r of LAND.runs) {
    const s = [], e = [];
    let c = 0;
    for (let i = 0; i < r.length; i += 2) { c += r[i]; s.push(c); c += r[i + 1]; e.push(c); }
    rowsS.push(s); rowsE.push(e);
  }
  const CELL = LAND.cell, LON0 = LAND.lon0, LAT0 = LAND.lat0, COLS = LAND.cols, ROWS = LAND.rows;

  // ---------- 상태 ----------
  let W = 0, H = 0, dpr = 1;
  const view = { cx: 119, cy: 18, z: 9 };
  let overview = { cx: 119, cy: 18, z: 9 };
  let tween = null;
  let selected = null;
  let worldMode = false;
  let playing = false;
  let playTimer = 0;
  let visible = false;
  let arcCount = 0;   // 그려진 여정 구간 수 (소수)
  let arcTarget = 0;
  let arcMs = 420;    // 구간 하나를 그리는 데 걸리는 시간
  let dotsDirty = true;
  let raf = 0;
  let last = 0;
  const cursor = { x: -999, y: -999, on: false };
  const selectHooks = [];   // 다른 모듈(날씨 등)이 '핀 선택'에 반응할 수 있도록
  const layoutHooks = [];   // 지도가 다시 배치될 때(엽서 핀 위치 갱신 등)

  const BASE = "rgba(92, 128, 210, 0.42)";
  const WARM = "rgba(240, 195, 106, 0.78)";
  const HOT = "rgba(196, 220, 255, 0.96)";

  const px = (lon) => W / 2 + (lon - view.cx) * view.z;
  const py = (lat) => H / 2 - (lat - view.cy) * view.z;
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // ---------- 핀 / 타임라인 만들기 ----------
  const pinEls = TRIPS.map((t, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "pin";
    b.style.setProperty("--i", i);
    b.setAttribute("aria-label", `${t.year}년 ${t.place}, ${t.country}`);
    b.innerHTML = `<span class="pin-dot">${i + 1}</span><span class="pin-label">${esc(t.place)} · ${t.year}</span>`;
    b.addEventListener("click", () => (selected === i ? deselect() : select(i)));
    pinsEl.appendChild(b);
    return b;
  });

  const chips = TRIPS.map((t, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chip";
    b.setAttribute("role", "listitem");
    b.innerHTML = `<b>${t.year}</b>${esc(t.place)}`;
    b.addEventListener("click", () => select(i));
    timeline.appendChild(b);
    return b;
  });

  // ---------- 화면 크기 / 시점 ----------
  function computeOverview() {
    const narrow = W < 640;
    const z = narrow ? Math.min(W / 46, H / 60) : Math.min(H / 68, W / 95);
    overview = { cx: narrow ? 121 : 119, cy: 18, z };
  }
  const focusZoom = () => Math.min(20, overview.z * 2.3);
  function worldView() {
    return { cx: 12, cy: 12, z: Math.min(W / 340, H / 125) };
  }
  // 패널이 지도를 가리는 만큼 핀이 보이는 자리를 비켜 줍니다 (옆에 있으면 가로로, 아래 시트면 세로로)
  function panelOffset() {
    if (panel.hidden || getComputedStyle(panel).position !== "absolute") return { x: 0, y: 0 };
    return panel.offsetWidth > W * 0.8 ? { x: 0, y: panel.offsetHeight + 10 } : { x: panel.offsetWidth + 14, y: 0 };
  }
  function focusView(i) {
    const t = TRIPS[i];
    const z = focusZoom();
    const o = panelOffset();
    return { cx: t.lon + o.x / (2 * z), cy: t.lat - o.y / (2 * z), z };
  }

  function resize() {
    const r = stage.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width));
    H = Math.max(1, Math.round(r.height));
    dpr = Math.min(2, window.devicePixelRatio || 1);
    for (const c of [cDots, cFx]) { c.width = W * dpr; c.height = H * dpr; }
    computeOverview();
    tween = null;
    Object.assign(view, selected !== null ? focusView(selected) : worldMode ? worldView() : overview);
    dotsDirty = true;
    request();
  }

  // ---------- 그리기: 점 지도 ----------
  function drawDots() {
    gD.setTransform(dpr, 0, 0, dpr, 0, 0);
    gD.clearRect(0, 0, W, H);
    const z = view.z;
    const cellPx = CELL * z;
    const k = Math.max(1, Math.ceil(5.6 / cellPx));           // 화면 간격이 너무 촘촘하지 않도록 격자를 성기게
    const r0 = Math.max(0.7, Math.min(3.2, cellPx * k * 0.27));
    const lonMin = view.cx - W / 2 / z - 1, lonMax = view.cx + W / 2 / z + 1;
    const latMax = view.cy + H / 2 / z + 1, latMin = view.cy - H / 2 / z - 1;
    const cMin = Math.max(0, Math.floor((lonMin - LON0) / CELL));
    const cMax = Math.min(COLS, Math.ceil((lonMax - LON0) / CELL));
    const rMin = Math.max(0, Math.floor((LAT0 - latMax) / CELL));
    const rMax = Math.min(ROWS, Math.ceil((LAT0 - latMin) / CELL));

    const pp = TRIPS.map((t) => [px(t.lon), py(t.lat)]);
    const PR2 = Math.pow(Math.max(46, Math.min(z, 10) * 5.5), 2);
    const CR = 92, CR2 = CR * CR;
    const base = new Path2D(), warm = new Path2D(), hot = new Path2D();

    for (let r = Math.ceil(rMin / k) * k; r < rMax; r += k) {
      const y = H / 2 - (LAT0 - (r + 0.5) * CELL - view.cy) * z;
      const S = rowsS[r], E = rowsE[r];
      for (let i = 0; i < S.length; i++) {
        const a = Math.max(S[i], cMin), b = Math.min(E[i], cMax);
        for (let c = Math.ceil(a / k) * k; c < b; c += k) {
          const x = W / 2 + (LON0 + (c + 0.5) * CELL - view.cx) * z;
          let rad = r0, path = base;
          if (cursor.on) {
            const dx = x - cursor.x, dy = y - cursor.y, d2 = dx * dx + dy * dy;
            if (d2 < CR2) { rad = r0 * (1 + (1 - Math.sqrt(d2) / CR) * 1.15); path = hot; }
          }
          if (path === base) {
            for (let p = 0; p < pp.length; p++) {
              const dx = x - pp[p][0], dy = y - pp[p][1];
              if (dx * dx + dy * dy < PR2) { path = warm; rad = r0 * 1.35; break; }
            }
          }
          path.moveTo(x + rad, y);
          path.arc(x, y, rad, 0, TAU);
        }
      }
    }
    gD.fillStyle = BASE; gD.fill(base);
    gD.fillStyle = WARM; gD.fill(warm);
    gD.fillStyle = HOT; gD.fill(hot);
  }

  // ---------- 그리기: 여정 선 ----------
  function ctrl(a, b) {
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    const dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len, bend = len * 0.24;
    const c1 = { x: mx + nx * bend, y: my + ny * bend }, c2 = { x: mx - nx * bend, y: my - ny * bend };
    return c1.y < c2.y ? c1 : c2; // 항상 위로 볼록한 곡선
  }
  const bez = (a, c, b, t) => {
    const u = 1 - t;
    return { x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y };
  };

  function drawFx(now) {
    gF.setTransform(dpr, 0, 0, dpr, 0, 0);
    gF.clearRect(0, 0, W, H);
    if (arcCount <= 0) return;
    const pts = TRIPS.map((t) => ({ x: px(t.lon), y: py(t.lat) }));
    gF.lineCap = "round";
    for (let i = 1; i < N; i++) {
      const prog = Math.max(0, Math.min(1, arcCount - (i - 1)));
      if (prog <= 0) break;
      const a = pts[i - 1], b = pts[i], c = ctrl(a, b), hi = selected === i;
      gF.beginPath();
      for (let s = 0; s <= 36; s++) {
        const p = bez(a, c, b, (prog * s) / 36);
        s ? gF.lineTo(p.x, p.y) : gF.moveTo(p.x, p.y);
      }
      gF.setLineDash([2, 7]);
      gF.lineDashOffset = reduce ? 0 : -now * 0.012;
      gF.lineWidth = hi ? 2.6 : 1.5;
      gF.strokeStyle = hi ? "rgba(255,255,255,0.96)" : "rgba(240,195,106,0.85)";
      gF.shadowColor = "rgba(240,195,106,0.9)";
      gF.shadowBlur = hi ? 12 : 6;
      gF.stroke();
      gF.shadowBlur = 0;
      gF.setLineDash([]);
    }
    // 길을 따라 이동하는 탈것: 비행기, 자전거 여행이 있던 구간은 자전거
    if (!reduce && arcCount > 0) {
      let i, t;
      if (arcCount < arcTarget) {              // 선이 그려지는 중이면 선의 끝을 따라감
        i = Math.min(N - 1, Math.floor(arcCount) + 1);
        t = arcCount - Math.floor(arcCount);
      } else if (arcCount >= 1) {              // 다 그려졌으면 전체 여정을 반복 이동
        const total = Math.min(arcCount, N - 1);
        const s = ((now * 0.00016) % 1) * total;
        i = Math.min(N - 1, Math.floor(s) + 1);
        t = s - Math.floor(s);
      }
      if (i) {
        const a = pts[i - 1], b = pts[i], c = ctrl(a, b);
        const p = bez(a, c, b, t), q = bez(a, c, b, Math.min(1, t + 0.02));
        drawVehicle(p, Math.atan2(q.y - p.y, q.x - p.x), TRIPS[i].tag === "자전거" ? "bike" : "plane");
      }
    }
  }

  // 비행기(콧등이 진행 방향), 자전거(옆모습, 왼쪽으로 가면 좌우 반전)
  function drawVehicle(p, ang, kind) {
    gF.save();
    gF.translate(p.x, p.y);
    gF.shadowColor = "rgba(255,225,150,1)";
    gF.shadowBlur = 14;
    gF.fillStyle = gF.strokeStyle = "#fff";
    if (kind === "plane") {
      gF.rotate(ang + Math.PI / 2);
      gF.beginPath();
      [[0, -11], [2, -4], [11, 2], [11, 4.5], [2, 2.5], [1.6, 8], [4.5, 10], [4.5, 11.5], [0, 10.5],
        [-4.5, 11.5], [-4.5, 10], [-1.6, 8], [-2, 2.5], [-11, 4.5], [-11, 2], [-2, -4]]
        .forEach(([x, y], k) => (k ? gF.lineTo(x, y) : gF.moveTo(x, y)));
      gF.closePath();
      gF.fill();
    } else {
      const flip = Math.cos(ang) < 0 ? -1 : 1;
      gF.scale(flip, 1);
      gF.rotate(Math.max(-0.35, Math.min(0.35, ang * flip)) * 0.5);
      gF.lineWidth = 1.7;
      gF.lineCap = gF.lineJoin = "round";
      gF.beginPath(); gF.arc(-7, 4, 4.2, 0, TAU); gF.moveTo(11.2, 4); gF.arc(7, 4, 4.2, 0, TAU); gF.stroke();
      gF.beginPath();
      gF.moveTo(-7, 4); gF.lineTo(-2, -4); gF.lineTo(5, -4); gF.lineTo(7, 4);   // 뒷바퀴 - 안장 - 핸들 - 앞바퀴
      gF.moveTo(-7, 4); gF.lineTo(0, 4); gF.lineTo(-2, -4);
      gF.moveTo(0, 4); gF.lineTo(5, -4);
      gF.moveTo(-3.6, -5); gF.lineTo(-0.6, -5); gF.moveTo(5, -4); gF.lineTo(4, -6.4);
      gF.stroke();
      gF.beginPath(); gF.arc(0.6, -9, 2.1, 0, TAU); gF.fill();                   // 라이더
    }
    gF.restore();
  }

  function layoutPins() {
    for (let i = 0; i < N; i++) {
      pinEls[i].style.transform = `translate3d(${px(TRIPS[i].lon).toFixed(1)}px, ${py(TRIPS[i].lat).toFixed(1)}px, 0)`;
    }
    for (const f of layoutHooks) f();
  }

  // ---------- 애니메이션 루프 ----------
  function request() {
    if (!raf) raf = requestAnimationFrame(frame);
  }
  function frame(now) {
    raf = 0;
    const dt = last ? Math.min(64, now - last) : 16;
    last = now;
    if (tween) {
      const p = Math.min(1, (now - tween.t0) / tween.dur);
      const e = ease(p);
      view.cx = lerp(tween.from.cx, tween.to.cx, e);
      view.cy = lerp(tween.from.cy, tween.to.cy, e);
      // 살짝 멀어졌다가 다가오는 "날아가기" 느낌
      view.z = Math.exp(lerp(Math.log(tween.from.z), Math.log(tween.to.z), e)) * (1 - tween.dip * Math.sin(Math.PI * e));
      if (p >= 1) { Object.assign(view, tween.to); tween = null; }
      dotsDirty = true;
    }
    if (arcCount < arcTarget) arcCount = Math.min(arcTarget, arcCount + dt / arcMs);
    else if (arcCount > arcTarget) arcCount = arcTarget;
    if (dotsDirty) { drawDots(); layoutPins(); dotsDirty = false; }
    drawFx(now);
    if ((visible && !reduce) || tween || arcCount !== arcTarget) request();
    else last = 0;
  }
  function flyTo(to, dur = 1500) {
    if (reduce) { Object.assign(view, to); tween = null; dotsDirty = true; request(); return; }
    const dist = Math.hypot(to.cx - view.cx, to.cy - view.cy);
    tween = { from: { ...view }, to, t0: performance.now(), dur, dip: Math.min(0.22, dist / 160) };
    request();
  }

  // ---------- 상세 패널 ----------
  function mediaHTML(m, k) {
    const inner = m.type === "vid"
      ? `<video src="${m.src}" poster="${m.poster}" muted loop playsinline ${reduce ? "" : "autoplay"} preload="metadata" aria-hidden="true"></video><span class="badge">영상</span>`
      : `<img src="${m.src}" alt="${esc(m.alt)}" loading="lazy" decoding="async">`;
    return `<button type="button" class="tp-item" data-k="${k}" aria-label="확대해서 보기: ${esc(m.alt)}">${inner}</button>`;
  }
  function renderPanel(i) {
    const t = TRIPS[i];
    const prev = TRIPS[(i - 1 + N) % N], next = TRIPS[(i + 1) % N];
    panel.hidden = false;
    panel.innerHTML =
      `<button type="button" class="tp-close" aria-label="닫기">✕</button>` +
      `<p class="tp-meta"><span>${t.year}</span><span class="tp-tag">${esc(t.tag)}</span></p>` +
      `<h3 class="tp-title">${esc(t.place)}${t.country !== t.place ? `<small>${esc(t.country)}</small>` : ""}</h3>` +
      `<p class="tp-weather" aria-live="polite"></p>` +
      `<div class="tp-media">${t.media.map(mediaHTML).join("")}</div>` +
      `<div class="tp-nav"><button type="button" data-nav="-1">← ${esc(prev.place)}</button><span>${i + 1} / ${N}</span><button type="button" data-nav="1">${esc(next.place)} →</button></div>`;
    panel.classList.remove("open");
    void panel.offsetWidth; // 애니메이션 재시작
    panel.classList.add("open");
  }
  panel.addEventListener("click", (e) => {
    if (e.target.closest(".tp-close")) return deselect();
    const nav = e.target.closest("[data-nav]");
    if (nav) return select((selected + Number(nav.dataset.nav) + N) % N);
    const item = e.target.closest(".tp-item");
    if (item && selected !== null && window.openLightbox) window.openLightbox(TRIPS[selected].media, Number(item.dataset.k));
  });

  // ---------- 선택 / 해제 / 재생 ----------
  function scrollChip(el) {
    timeline.scrollTo({ left: el.offsetLeft - timeline.clientWidth / 2 + el.offsetWidth / 2, behavior: reduce ? "auto" : "smooth" });
  }
  function select(i, { auto = false } = {}) {
    if (!auto) stopPlay();
    worldMode = false;
    selected = i;
    hint.classList.add("gone");
    pinEls.forEach((el, k) => el.classList.toggle("on", k === i));
    chips.forEach((el, k) => { el.classList.toggle("on", k === i); if (k === i) scrollChip(el); });
    renderPanel(i);
    for (const f of selectHooks) f(i, TRIPS[i]);
    flyTo(focusView(i));
    dotsDirty = true;
    request();
  }
  function deselect() {
    if (selected === null) return;
    const from = pinEls[selected];
    selected = null;
    pinEls.forEach((el) => el.classList.remove("on"));
    chips.forEach((el) => el.classList.remove("on"));
    panel.hidden = true;
    stopPlay();
    flyTo(overview);
    dotsDirty = true;
    request();
    if (document.activeElement && document.activeElement.closest && document.activeElement.closest("#tripPanel")) from.focus();
  }
  function stopPlay() {
    playing = false;
    clearTimeout(playTimer);
    btnPlay.setAttribute("aria-pressed", "false");
    btnPlay.textContent = "▶ 여정 재생";
    arcTarget = N - 1;
  }
  function play() {
    if (playing) { stopPlay(); return; }
    playing = true;
    btnPlay.setAttribute("aria-pressed", "true");
    btnPlay.textContent = "⏸ 멈춤";
    arcMs = 900;
    arcCount = 0;
    arcTarget = 0;
    let i = 0;
    const step = () => {
      if (!playing) return;
      if (i >= N) { const done = selected; stopPlay(); if (done !== null) deselect(); return; }
      arcTarget = i;
      select(i, { auto: true });
      i++;
      playTimer = setTimeout(step, reduce ? 2800 : 3800);
    };
    step();
  }
  btnPlay.addEventListener("click", play);
  btnWorld.addEventListener("click", () => {
    stopPlay();
    if (selected !== null) { selected = null; pinEls.forEach((el) => el.classList.remove("on")); chips.forEach((el) => el.classList.remove("on")); panel.hidden = true; }
    worldMode = !worldMode;
    btnWorld.textContent = worldMode ? "🗺️ 아시아 보기" : "🌍 전체 보기";
    flyTo(worldMode ? worldView() : overview, 1800);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && selected !== null) deselect();
  });

  // ---------- 마우스 반응 (점이 커지며 빛남) ----------
  stage.addEventListener("pointermove", (e) => {
    if (e.pointerType === "touch") return;
    const r = stage.getBoundingClientRect();
    cursor.x = e.clientX - r.left;
    cursor.y = e.clientY - r.top;
    cursor.on = true;
    dotsDirty = true;
    request();
  });
  stage.addEventListener("pointerleave", () => { cursor.on = false; dotsDirty = true; request(); });

  // ---------- 시작 ----------
  new ResizeObserver(resize).observe(stage);
  resize();
  arcTarget = 0;

  new IntersectionObserver((entries) => {
    const v = entries[0].isIntersecting;
    if (v && !visible && !stage.classList.contains("ready")) {
      stage.classList.add("ready");             // 핀이 차례로 나타남
      if (!playing) { arcTarget = N - 1; arcMs = reduce ? 1 : 420; } // 여정 선이 이어짐
    }
    visible = v;
    if (v) request();
  }, { threshold: 0.25 }).observe(stage);

  // 서버에서 받은 데이터로 라벨/좌표가 바뀌었을 때 화면 갱신
  function refresh() {
    TRIPS.forEach((t, i) => {
      pinEls[i].setAttribute("aria-label", `${t.year}년 ${t.place}, ${t.country}`);
      pinEls[i].querySelector(".pin-label").textContent = `${t.place} · ${t.year}`;
      chips[i].innerHTML = `<b>${t.year}</b>${esc(t.place)}`;
    });
    dotsDirty = true;
    request();
  }

  // 다른 스크립트(엽서, 날씨, 명령 팔레트, 서버 데이터 반영)가 지도를 다룰 수 있는 접점
  window.TripMap = {
    stage, pinsEl, size: () => ({ W, H }), px, py,
    view: () => ({ ...view }),
    inv: (x, y) => ({ lon: view.cx + (x - W / 2) / view.z, lat: view.cy - (y - H / 2) / view.z }),
    select, deselect, play, refresh, request,
    toggleWorld: () => btnWorld.click(),
    onSelect: (f) => selectHooks.push(f),
    onLayout: (f) => layoutHooks.push(f),
    redraw: () => { dotsDirty = true; request(); },
  };
})();
