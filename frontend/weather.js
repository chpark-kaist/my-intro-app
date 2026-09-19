// 핀 패널에 "현지 시각 + 지금 날씨"를 표시합니다.
// 브라우저 → FastAPI(/api/weather) → Open-Meteo 순서로 호출하며, 실패하면 현지 시각만 보여 줍니다.
(() => {
  "use strict";
  const map = window.TripMap;
  if (!map) return;
  const cache = new Map();          // 좌표 -> { w, at }
  const TTL = 10 * 60 * 1000;
  let token = 0;
  const SOURCES = { "Open-Meteo": "https://open-meteo.com/", "MET Norway": "https://www.met.no/en" };  // 날씨 데이터 출처 표기

  function localTime(tz) {
    try {
      return new Intl.DateTimeFormat("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: tz }).format(new Date());
    } catch (_) {
      return "";
    }
  }

  function show(el, t, w) {
    el.textContent = "";
    const time = t.tz ? localTime(t.tz) : "";
    const parts = [];
    if (w) parts.push(`${w.icon} 지금 ${w.temp_c}°C · ${w.label}`);
    if (time) parts.push(`현지 ${time}`);
    el.append(parts.join("  ·  "));
    if (w) {
      const src = document.createElement("a");
      src.className = "src";
      src.href = SOURCES[w.source] || "https://open-meteo.com/";
      src.target = "_blank";
      src.rel = "noopener";
      src.textContent = w.source || "Open-Meteo";
      el.append(" ", src);
    }
  }

  map.onSelect(async (i, t) => {
    const my = ++token;
    const el = document.querySelector("#tripPanel .tp-weather");
    if (!el) return;
    const key = `${t.lat.toFixed(1)},${t.lon.toFixed(1)}`;
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < TTL) { show(el, t, hit.w); return; }
    show(el, t, null);
    el.append(" · 날씨 불러오는 중…");
    try {
      const w = await window.apiFetch(`/api/weather?lat=${t.lat}&lon=${t.lon}`, { timeout: 25000 });
      cache.set(key, { w, at: Date.now() });
      if (my === token && el.isConnected) show(el, t, w);
    } catch (_) {
      if (my === token && el.isConnected) show(el, t, null);   // 시각만 표시
    }
  });
})();
