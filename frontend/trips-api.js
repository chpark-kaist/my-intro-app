// 백엔드(FastAPI)에서 여행 목록과 통계를 받아 지도에 반영합니다.
// 서버가 잠들어 있거나 실패해도 이 페이지에 들어 있는 데이터로 그대로 동작합니다.
(() => {
  "use strict";
  const TRIPS = window.TRIPS;
  const map = window.TripMap;
  const box = document.getElementById("tripStats");
  const badge = document.getElementById("apiBadge");
  if (!TRIPS || !map || !box) return;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- 통계 (서버 응답이 없을 때 쓰는 같은 계산) ----------
  const EARTH_KM = 40075;
  const rad = (d) => (d * Math.PI) / 180;
  function haversine(a, b) {
    const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lon - a.lon) / 2) ** 2;
    return 2 * 6371 * Math.asin(Math.sqrt(h));
  }
  function localStats() {
    const legs = TRIPS.slice(1).map((t, i) => ({ from: TRIPS[i].place, to: t.place, km: haversine(TRIPS[i], t) }));
    const total = legs.reduce((s, l) => s + l.km, 0);
    const longest = legs.reduce((a, b) => (b.km > a.km ? b : a));
    return {
      total_km: Math.round(total),
      earth_laps: Math.round((total / EARTH_KM) * 100) / 100,
      longest: { from: longest.from, to: longest.to, km: Math.round(longest.km) },
    };
  }

  // ---------- 화면 ----------
  const els = {
    km: box.querySelector("[data-km]"),
    laps: box.querySelector("[data-laps]"),
    lapsNote: box.querySelector("[data-laps-note]"),
    long: box.querySelector("[data-long]"),
    longNote: box.querySelector("[data-long-note]"),
  };
  const shown = { km: 0, laps: 0, long: 0 };
  let visible = false;
  let latest = null;

  function tween(key, el, to, fmt) {
    const from = shown[key], t0 = performance.now(), dur = reduce ? 1 : 1400;
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      shown[key] = from + (to - from) * e;
      el.textContent = fmt(shown[key]);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  const nf = new Intl.NumberFormat("ko-KR");
  function render() {
    if (!latest || !visible) return;
    const s = latest;
    tween("km", els.km, s.total_km, (v) => nf.format(Math.round(v)));
    tween("laps", els.laps, s.earth_laps, (v) => v.toFixed(2));
    tween("long", els.long, s.longest.km, (v) => nf.format(Math.round(v)));
    els.lapsNote.textContent = `지구 둘레 ${nf.format(EARTH_KM)}km 기준 · 약 ${Math.round(s.earth_laps * 100)}%`;
    els.longNote.textContent = `${s.longest.from} → ${s.longest.to}`;
  }
  function setStats(s) {
    latest = s;
    render();
  }
  new IntersectionObserver((es) => {
    if (es[0].isIntersecting && !visible) { visible = true; render(); }
  }, { threshold: 0.4 }).observe(box);

  function setBadge(state, text) {
    badge.dataset.state = state;
    badge.textContent = text;
  }

  // ---------- 1) 먼저 이 페이지의 데이터로 즉시 표시 ----------
  setStats(localStats());
  setBadge("pending", "🟡 서버에 연결 중… (Render 무료 서버가 잠들어 있으면 최대 1분 걸려요. 그동안은 이 페이지의 데이터로 보여 드려요)");

  // ---------- 2) 서버에서 받아 덮어쓰기 ----------
  const FIELDS = ["year", "place", "country", "lat", "lon", "tag", "tz"];
  window.apiFetch("/api/trips", { timeout: 75000 })
    .then((data) => {
      let merged = 0;
      for (const st of data.trips || []) {
        const t = TRIPS.find((x) => x.id === st.id);   // 사진·영상은 이 페이지에 있으므로 id가 같은 여행만 갱신
        if (!t) continue;
        for (const f of FIELDS) if (st[f] !== undefined && typeof st[f] === typeof t[f]) t[f] = st[f];
        merged++;
      }
      map.refresh();
      if (data.stats && data.stats.total_km) setStats(data.stats);
      setBadge("ok", `🟢 지도 데이터와 통계를 서버(FastAPI ${window.API_BASE.replace(/^https?:\/\//, "")})에서 받아 왔어요 · 여행 ${merged}곳`);
    })
    .catch(() => setBadge("off", "⚪ 서버에 연결하지 못해 이 페이지에 들어 있는 데이터로 보여 드리고 있어요"));
})();
