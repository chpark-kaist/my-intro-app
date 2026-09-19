// ============================================================
// ★ 백엔드 주소 설정
// Render에 배포한 뒤 받은 주소(예: https://my-intro-api.onrender.com)를
// 아래 PROD_API_URL 에 붙여넣으세요. 끝에 슬래시(/)는 붙이지 않습니다.
// ============================================================
const PROD_API_URL = "https://my-intro-api.onrender.com";

// 내 컴퓨터(localhost)에서 열었을 때는 로컬 백엔드, Vercel에서는 Render 백엔드를 사용
const isLocal =
  location.hostname === "localhost" || location.hostname === "127.0.0.1";
const API_BASE = isLocal ? "http://127.0.0.1:8000" : PROD_API_URL;

const COLD_START_MSG =
  "요청 중... (Render 무료 서버가 잠들어 있으면 30~60초 걸릴 수 있어요)";

// ---------- 공통 도우미 ----------
async function callApi(path, options) {
  const res = await fetch(API_BASE + path, options);
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const detail = data && data.detail ? JSON.stringify(data.detail) : res.statusText;
    throw new Error(`HTTP ${res.status} - ${detail}`);
  }
  return data;
}

function $(id) {
  return document.getElementById(id);
}

// Swagger 링크 연결
$("link-docs").href = API_BASE + "/docs";

// ---------- 1. 상태 확인 ----------
$("btn-health").addEventListener("click", async () => {
  const btn = $("btn-health");
  const out = $("out-health");
  btn.disabled = true;
  out.textContent = COLD_START_MSG;
  try {
    const data = await callApi("/health");
    out.textContent = JSON.stringify(data, null, 2);
  } catch (err) {
    out.textContent = "오류: " + err.message;
  } finally {
    btn.disabled = false;
  }
});

// ---------- 2. 인사 받기 ----------
$("form-hello").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = $("input-hello").value.trim() || "방문자";
  const out = $("out-hello");
  out.textContent = COLD_START_MSG;
  try {
    const data = await callApi("/api/hello?name=" + encodeURIComponent(name));
    out.textContent = data.message;
  } catch (err) {
    out.textContent = "오류: " + err.message;
  }
});

// ---------- 3. 방명록 ----------
function renderGuestbook(items) {
  const list = $("gb-list");
  list.innerHTML = "";
  if (items.length === 0) {
    $("gb-status").textContent = "아직 글이 없습니다. 첫 글을 남겨보세요!";
    return;
  }
  $("gb-status").textContent = "";
  for (const item of items) {
    const li = document.createElement("li");
    const who = document.createElement("span");
    who.className = "who";
    who.textContent = item.name; // textContent: 사용자 입력을 안전하게 표시(XSS 방지)
    const when = document.createElement("span");
    when.className = "when";
    when.textContent = new Date(item.created_at).toLocaleString("ko-KR");
    const msg = document.createElement("div");
    msg.textContent = item.message;
    li.append(who, when, msg);
    list.appendChild(li);
  }
}

async function loadGuestbook() {
  $("gb-status").textContent = COLD_START_MSG;
  try {
    renderGuestbook(await callApi("/api/guestbook"));
  } catch (err) {
    $("gb-status").textContent = "방명록을 불러오지 못했습니다: " + err.message;
  }
}

$("form-guestbook").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = $("gb-name").value.trim();
  const message = $("gb-message").value.trim();
  if (!name || !message) return;
  try {
    await callApi("/api/guestbook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, message }),
    });
    $("gb-message").value = "";
    await loadGuestbook();
  } catch (err) {
    $("gb-status").textContent = "등록 실패: " + err.message;
  }
});

// 페이지가 열리면 방명록을 한 번 불러옵니다.
loadGuestbook();
