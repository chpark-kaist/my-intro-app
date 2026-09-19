// 방문자 엽서: 지도의 원하는 곳을 눌러 엽서를 붙이면 FastAPI(/api/postcards)에 저장되고, 모든 방문자의 지도에 핀으로 나타납니다.
// 서버는 메모리에 저장하므로 서버가 재시작되면 엽서는 사라집니다.
(() => {
  "use strict";
  const map = window.TripMap;
  const btn = document.getElementById("btnCard");
  if (!map || !btn) return;
  const { stage, pinsEl } = map;

  const ENVELOPE =
    '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>';

  let cards = [];
  const pinEls = new Map();      // id -> button
  let placing = false;
  let pending = null;            // { lat, lon } 붙이려는 위치
  let openCard = null;           // 읽고 있는 엽서
  let ghost = null;
  let sending = false;

  // ---------- 요소 ----------
  const pop = document.createElement("div");
  pop.className = "card-pop";
  pop.hidden = true;
  pop.setAttribute("role", "dialog");
  stage.appendChild(pop);

  const tip = document.createElement("p");
  tip.className = "place-tip";
  tip.hidden = true;
  tip.textContent = "✉️ 지도를 눌러 엽서를 붙일 곳을 골라 주세요 · 취소는 Esc";
  stage.appendChild(tip);

  function fmt(iso) {
    return new Date(iso).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
  }
  function norm(lon) { return ((((lon + 180) % 360) + 360) % 360) - 180; }

  // ---------- 핀 ----------
  function renderPin(c) {
    if (pinEls.has(c.id)) return;
    const b = document.createElement("button");
    b.type = "button";
    b.className = "pin card-pin";
    b.setAttribute("aria-label", `${c.name}님의 엽서 읽기`);
    b.innerHTML = `<span class="card-dot">${ENVELOPE}</span>`;
    b.addEventListener("click", () => (openCard && openCard.id === c.id ? closePop() : showRead(c)));
    pinsEl.appendChild(b);
    pinEls.set(c.id, b);
    place(b, c);
  }
  function place(el, p) {
    el.style.transform = `translate3d(${map.px(p.lon).toFixed(1)}px, ${map.py(p.lat).toFixed(1)}px, 0)`;
  }
  function layout() {
    for (const c of cards) { const el = pinEls.get(c.id); if (el) place(el, c); }
    if (ghost && pending) place(ghost, pending);
    positionPop();
  }
  map.onLayout(layout);

  // ---------- 팝업 ----------
  function anchor() { return openCard || pending; }
  function positionPop() {
    const a = anchor();
    if (pop.hidden || !a) return;
    const { W, H } = map.size();
    const x = map.px(a.lon), y = map.py(a.lat);
    const w = pop.offsetWidth || 270, h = pop.offsetHeight || 150;
    let left = x + 18;
    if (left + w > W - 8) left = x - 18 - w;
    left = Math.max(8, Math.min(left, W - w - 8));
    const top = Math.max(8, Math.min(y - h / 2, H - h - 8));
    pop.style.left = `${left}px`;
    pop.style.top = `${top}px`;
  }
  function closePop() {
    pop.hidden = true;
    pop.textContent = "";
    openCard = null;
  }

  function showRead(c) {
    openCard = c;
    pending = null;
    if (ghost) { ghost.remove(); ghost = null; }
    pop.textContent = "";
    const head = document.createElement("div");
    head.className = "cp-head";
    const who = document.createElement("strong");
    who.textContent = `✉️ ${c.name}`;
    const when = document.createElement("span");
    when.textContent = fmt(c.created_at);
    const x = document.createElement("button");
    x.type = "button"; x.className = "cp-x"; x.setAttribute("aria-label", "닫기"); x.textContent = "✕";
    x.addEventListener("click", closePop);
    head.append(who, when, x);
    const msg = document.createElement("p");
    msg.className = "cp-msg";
    msg.textContent = c.message;    // 사용자 입력은 textContent로만 표시 (XSS 방지)
    pop.append(head, msg);
    pop.hidden = false;
    positionPop();
  }

  function showForm() {
    closePop();
    pop.textContent = "";
    const form = document.createElement("form");
    form.className = "cp-form";
    form.innerHTML =
      '<div class="cp-head"><strong>✉️ 엽서 쓰기</strong><button type="button" class="cp-x" aria-label="닫기">✕</button></div>' +
      '<input name="name" type="text" maxlength="20" placeholder="이름" required autocomplete="nickname" />' +
      '<input name="message" type="text" maxlength="100" placeholder="남기고 싶은 말 (100자)" required />' +
      '<div class="cp-row"><button type="submit" class="chip-btn go">붙이기</button><button type="button" class="chip-btn cancel">취소</button></div>' +
      '<p class="cp-status" aria-live="polite"></p>';
    try { form.name.value = localStorage.getItem("cardName") || ""; } catch (_) {}
    form.querySelector(".cp-x").addEventListener("click", () => setPlacing(false));
    form.querySelector(".cancel").addEventListener("click", () => setPlacing(false));
    form.addEventListener("submit", (e) => { e.preventDefault(); send(form); });
    pop.append(form);
    pop.hidden = false;
    positionPop();
    (form.name.value ? form.message : form.name).focus();
  }

  // ---------- 서버 통신 ----------
  async function send(form) {
    if (sending || !pending) return;
    const name = form.name.value.trim(), message = form.message.value.trim();
    if (!name || !message) return;
    const status = form.querySelector(".cp-status");
    const go = form.querySelector(".go");
    sending = true;
    go.disabled = true;
    status.textContent = "보내는 중…";
    const slow = setTimeout(() => { status.textContent = "서버를 깨우는 중이에요… 최대 1분 걸릴 수 있어요"; }, 5000);
    try {
      const card = await window.apiFetch("/api/postcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, message, lat: pending.lat, lon: pending.lon }),
        timeout: 70000,
      });
      try { localStorage.setItem("cardName", name); } catch (_) {}
      cards.push(card);
      renderPin(card);
      setPlacing(false);
      showRead(card);
    } catch (err) {
      status.textContent =
        err.status === 429 ? err.message :
        err.status === 422 ? "이름과 내용을 확인해 주세요" :
        err.name === "AbortError" ? "서버가 아직 깨어나는 중이에요. 잠시 후 다시 눌러 주세요" :
        "엽서를 보내지 못했어요. 잠시 후 다시 시도해 주세요";
    } finally {
      clearTimeout(slow);
      sending = false;
      go.disabled = false;
    }
  }

  async function load() {
    try {
      const list = await window.apiFetch("/api/postcards", { timeout: 75000 });
      if (!Array.isArray(list)) return;
      cards = list;
      cards.forEach(renderPin);
      layout();
    } catch (_) { /* 서버가 없어도 지도는 그대로 동작 */ }
  }

  // ---------- 붙일 위치 고르기 ----------
  function setPlacing(on) {
    placing = on;
    btn.setAttribute("aria-pressed", String(on));
    stage.classList.toggle("placing", on);
    tip.hidden = !on;
    if (on) {
      map.deselect();
      closePop();
    } else {
      closePop();
      pending = null;
      if (ghost) { ghost.remove(); ghost = null; }
    }
  }
  btn.addEventListener("click", () => setPlacing(!placing));
  window.startPostcard = () => setPlacing(true);

  stage.addEventListener("click", (e) => {
    if (!placing || e.target.closest(".map-ui, .card-pop, .pin")) return;
    const r = stage.getBoundingClientRect();
    const p = map.inv(e.clientX - r.left, e.clientY - r.top);
    if (p.lat < -60 || p.lat > 80) { tip.textContent = "이 위치에는 붙일 수 없어요. 다른 곳을 눌러 주세요"; return; }
    tip.textContent = "✉️ 엽서를 쓰고 붙이기를 눌러 주세요 · 다른 곳을 누르면 위치를 옮길 수 있어요";
    pending = { lat: Math.round(p.lat * 10) / 10, lon: Math.round(norm(p.lon) * 10) / 10 };
    if (!ghost) {
      ghost = document.createElement("span");
      ghost.className = "pin card-pin ghost";
      ghost.innerHTML = `<span class="card-dot">${ENVELOPE}</span>`;
      pinsEl.appendChild(ghost);
    }
    place(ghost, pending);
    showForm();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (placing) setPlacing(false);
    else if (openCard) closePop();
  });
  // 다른 곳을 눌러 읽기 팝업 닫기
  document.addEventListener("click", (e) => {
    if (openCard && !e.target.closest(".card-pop, .card-pin")) closePop();
  });

  // 처음 불러오기 + 탭으로 돌아왔을 때 새 엽서 확인
  load();
  let lastLoad = Date.now();
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && Date.now() - lastLoad > 30000) { lastLoad = Date.now(); load(); }
  });
})();
