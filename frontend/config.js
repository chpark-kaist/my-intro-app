// 백엔드 주소 설정과 공통 fetch 도우미 (모든 페이지에서 가장 먼저 불러옵니다)
(() => {
  "use strict";
  // Render에 배포한 백엔드 주소. 끝에 슬래시(/)는 붙이지 않습니다.
  const PROD_API_URL = "https://my-intro-api.onrender.com";

  // 내 컴퓨터(localhost)에서 열었을 때는 로컬 백엔드, 배포된 페이지에서는 Render 백엔드를 사용
  const isLocal = location.hostname === "localhost" || location.hostname === "127.0.0.1";
  // 로컬 테스트 편의: http://localhost:5500/?api=http://127.0.0.1:8001 처럼 백엔드를 바꿀 수 있음 (배포 환경에서는 무시)
  const override = isLocal ? new URLSearchParams(location.search).get("api") : null;

  window.API_BASE = (override || (isLocal ? "http://127.0.0.1:8000" : PROD_API_URL)).replace(/\/$/, "");

  // 시간 제한이 있는 fetch → JSON. Render 무료 서버가 잠들어 있으면 첫 응답이 30~60초 걸릴 수 있어 timeout을 넉넉히 줄 수 있습니다.
  window.apiFetch = async (path, { timeout = 15000, ...opts } = {}) => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeout);
    try {
      const res = await fetch(window.API_BASE + path, { ...opts, signal: ctrl.signal });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const err = new Error((data && data.detail && String(data.detail)) || `HTTP ${res.status}`);
        err.status = res.status;
        throw err;
      }
      return data;
    } finally {
      clearTimeout(timer);
    }
  };
})();
