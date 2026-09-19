import math
import os
import re
import secrets
import time
from collections import deque
from datetime import datetime, timezone

import httpx
from fastapi import FastAPI, Header, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(
    title="박찬휘 개인 소개 API",
    description="클라우드 컴퓨팅 과제용 FastAPI 백엔드",
    version="1.0.0",
)

# ------------------------------------------------------------------
# CORS 설정
# 브라우저는 "다른 주소(도메인)"의 서버에 요청할 때, 그 서버가 허락했는지 확인합니다.
# Vercel(프론트)과 Render(백엔드)는 주소가 다르므로 허락 설정이 필요합니다.
# 환경변수 ALLOWED_ORIGINS 가 없으면 "*"(모두 허용)로 동작합니다.
# 나중에 Vercel 주소를 알게 되면 Render 환경변수에 넣어서 좁힐 수 있습니다.
# 여러 개는 쉼표로 구분, 끝에 슬래시(/)는 붙이지 않습니다.
# ------------------------------------------------------------------
raw_origins = os.getenv("ALLOWED_ORIGINS", "*")
origins = [o.strip() for o in raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 방명록 저장소 (메모리). 서버가 재시작/잠들면 사라집니다. 과제용으로는 충분합니다.
guestbook: list[dict] = []


class GuestbookIn(BaseModel):
    name: str = Field(..., min_length=1, max_length=20, description="작성자 이름")
    message: str = Field(..., min_length=1, max_length=200, description="방명록 내용")


@app.get("/", tags=["기본"])
def root():
    return {"message": "FastAPI 백엔드가 동작 중입니다. /docs 에서 API를 확인하세요."}


@app.get("/health", tags=["기본"])
def health():
    return {"status": "ok", "time": datetime.now(timezone.utc).isoformat()}


@app.get("/api/hello", tags=["연동 실습"])
def hello(name: str = "방문자"):
    return {"message": f"안녕하세요, {name}님! 백엔드에서 보낸 인사입니다."}


@app.get("/api/guestbook", tags=["방명록"])
def list_guestbook():
    # 최신 글이 위로 오도록 뒤집어서 반환
    return list(reversed(guestbook))


@app.post("/api/guestbook", status_code=201, tags=["방명록"])
def add_guestbook(entry: GuestbookIn):
    item = {
        "id": len(guestbook) + 1,
        "name": entry.name.strip(),
        "message": entry.message.strip(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    guestbook.append(item)
    return item


# ==================================================================
# 여기부터: 소개 페이지의 지도에서 사용하는 API (위의 기존 API는 그대로입니다)
# ==================================================================

# ---------- 1) 여행 목록 + 통계 ----------
# 위치는 도시 중심의 대략적인 좌표입니다. (사진의 실제 촬영 좌표가 아님)
TRIPS = [
    {"id": "okinawa", "year": 2017, "place": "오키나와", "country": "일본", "lat": 26.21, "lon": 127.68, "tag": "여행", "tz": "Asia/Tokyo"},
    {"id": "kenting", "year": 2017, "place": "컨딩", "country": "대만", "lat": 22.0, "lon": 120.8, "tag": "여행", "tz": "Asia/Taipei"},
    {"id": "mongolia", "year": 2018, "place": "몽골", "country": "몽골", "lat": 45.0, "lon": 105.0, "tag": "여행", "tz": "Asia/Ulaanbaatar"},
    {"id": "osaka", "year": 2018, "place": "오사카", "country": "일본", "lat": 34.69, "lon": 135.5, "tag": "여행", "tz": "Asia/Tokyo"},
    {"id": "tokyo", "year": 2019, "place": "도쿄", "country": "일본", "lat": 35.68, "lon": 139.76, "tag": "여행", "tz": "Asia/Tokyo"},
    {"id": "thailand", "year": 2019, "place": "방콕 · 칸차나부리", "country": "태국", "lat": 13.75, "lon": 100.5, "tag": "여행", "tz": "Asia/Bangkok"},
    {"id": "hoian", "year": 2022, "place": "다낭 · 호이안", "country": "베트남", "lat": 15.95, "lon": 108.3, "tag": "여행", "tz": "Asia/Ho_Chi_Minh"},
    {"id": "fukuoka", "year": 2024, "place": "후쿠오카", "country": "일본", "lat": 33.59, "lon": 130.4, "tag": "여행", "tz": "Asia/Tokyo"},
    {"id": "bali", "year": 2024, "place": "발리", "country": "인도네시아", "lat": -8.65, "lon": 115.17, "tag": "여행", "tz": "Asia/Makassar"},
    {"id": "jeju", "year": 2026, "place": "제주", "country": "한국", "lat": 33.45, "lon": 126.55, "tag": "자전거", "tz": "Asia/Seoul"},
]

EARTH_KM = 40075  # 지구 둘레(적도)


def haversine_km(a: dict, b: dict) -> float:
    """두 지점 사이의 직선(대원) 거리, km"""
    r = 6371.0
    p1, p2 = math.radians(a["lat"]), math.radians(b["lat"])
    dp, dl = p2 - p1, math.radians(b["lon"] - a["lon"])
    h = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(h))


def trip_stats() -> dict:
    legs = [(TRIPS[i - 1], TRIPS[i], haversine_km(TRIPS[i - 1], TRIPS[i])) for i in range(1, len(TRIPS))]
    total = sum(d for _, _, d in legs)
    longest = max(legs, key=lambda x: x[2])
    return {
        "countries": len({t["country"] for t in TRIPS}),
        "places": len(TRIPS),
        "total_km": round(total),
        "earth_laps": round(total / EARTH_KM, 2),
        "longest": {"from": longest[0]["place"], "to": longest[1]["place"], "km": round(longest[2])},
        "note": "핀을 시간순으로 이어 붙인 직선거리 합계 (도시 중심 좌표 기준의 근사값)",
    }


@app.get("/api/trips", tags=["지도"])
def list_trips():
    """지도에 표시할 여행 목록과, 그 목록에서 계산한 통계"""
    return {"trips": TRIPS, "stats": trip_stats()}


# ---------- 2) 현재 날씨 (무료 Open-Meteo API를 서버가 대신 호출) ----------
WMO = {
    0: ("맑음", "☀️"), 1: ("대체로 맑음", "🌤️"), 2: ("구름 조금", "⛅"), 3: ("흐림", "☁️"),
    45: ("안개", "🌫️"), 48: ("안개", "🌫️"),
    51: ("이슬비", "🌦️"), 53: ("이슬비", "🌦️"), 55: ("이슬비", "🌦️"), 56: ("어는 이슬비", "🌧️"), 57: ("어는 이슬비", "🌧️"),
    61: ("비", "🌧️"), 63: ("비", "🌧️"), 65: ("강한 비", "🌧️"), 66: ("어는 비", "🌧️"), 67: ("어는 비", "🌧️"),
    71: ("눈", "🌨️"), 73: ("눈", "🌨️"), 75: ("강한 눈", "❄️"), 77: ("싸락눈", "🌨️"),
    80: ("소나기", "🌦️"), 81: ("소나기", "🌦️"), 82: ("강한 소나기", "⛈️"),
    85: ("눈 소나기", "🌨️"), 86: ("눈 소나기", "🌨️"),
    95: ("천둥번개", "⛈️"), 96: ("천둥번개·우박", "⛈️"), 99: ("천둥번개·우박", "⛈️"),
}
_weather_cache: dict[tuple[float, float], tuple[float, dict]] = {}
WEATHER_TTL = 600  # 10분


@app.get("/api/weather", tags=["지도"])
async def weather(
    lat: float = Query(..., ge=-90, le=90, description="위도"),
    lon: float = Query(..., ge=-180, le=180, description="경도"),
):
    """좌표의 현재 날씨. 프론트엔드 → FastAPI → Open-Meteo 순서로 호출합니다."""
    key = (round(lat, 1), round(lon, 1))  # 좌표를 뭉뚱그려 캐시 적중률을 높임
    hit = _weather_cache.get(key)
    if hit and time.time() - hit[0] < WEATHER_TTL:
        return hit[1]
    try:
        async with httpx.AsyncClient(timeout=8, headers={"User-Agent": "my-intro-api/1.0 (class project)"}) as client:
            r = await client.get(
                "https://api.open-meteo.com/v1/forecast",
                params={"latitude": key[0], "longitude": key[1], "current": "temperature_2m,weather_code,is_day"},
            )
            r.raise_for_status()
            cur = r.json()["current"]
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=502, detail=f"날씨 서버가 오류를 돌려줬습니다 (HTTP {e.response.status_code})")
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"날씨 서버에 연결하지 못했습니다 ({type(e).__name__})")
    except (KeyError, ValueError):
        raise HTTPException(status_code=502, detail="날씨 응답을 해석하지 못했습니다")
    label, icon = WMO.get(int(cur.get("weather_code", -1)), ("알 수 없음", "🌡️"))
    data = {
        "temp_c": round(float(cur["temperature_2m"]), 1),
        "label": label,
        "icon": icon,
        "is_day": bool(cur.get("is_day", 1)),
        "source": "Open-Meteo",
    }
    _weather_cache[key] = (time.time(), data)
    return data


# ---------- 3) 방문자 엽서 (메모리 저장: 서버가 재시작되면 사라집니다) ----------
MAX_POSTCARDS = 200
RATE_LIMIT = 5        # IP당 1분에 5장
RATE_WINDOW = 60
postcards: list[dict] = []
_next_card_id = 1
_recent: dict[str, deque] = {}
_CTRL = re.compile(r"[\x00-\x1f\x7f]")


class PostcardIn(BaseModel):
    name: str = Field(..., min_length=1, max_length=20, description="보낸 사람")
    message: str = Field(..., min_length=1, max_length=100, description="엽서 내용")
    lat: float = Field(..., ge=-60, le=80, description="붙일 위치의 위도")
    lon: float = Field(..., ge=-180, le=180, description="붙일 위치의 경도")


def client_ip(request: Request) -> str:
    xff = request.headers.get("x-forwarded-for")  # Render 같은 프록시 뒤에서는 첫 번째 값이 실제 접속자
    return xff.split(",")[0].strip() if xff else (request.client.host if request.client else "?")


@app.get("/api/postcards", tags=["지도"])
def list_postcards():
    return postcards


@app.post("/api/postcards", status_code=201, tags=["지도"])
def add_postcard(entry: PostcardIn, request: Request):
    global _next_card_id
    now = time.time()
    q = _recent.setdefault(client_ip(request), deque())
    while q and now - q[0] > RATE_WINDOW:
        q.popleft()
    if len(q) >= RATE_LIMIT:
        raise HTTPException(status_code=429, detail="엽서를 너무 빨리 보내고 있어요. 잠시 후 다시 시도해 주세요")
    name = _CTRL.sub("", entry.name).strip()
    message = _CTRL.sub("", entry.message).strip()
    if not name or not message:
        raise HTTPException(status_code=422, detail="이름과 내용을 입력해 주세요")
    q.append(now)
    card = {
        "id": _next_card_id,
        "name": name,
        "message": message,
        "lat": round(round(entry.lat * 2) / 2, 1),  # 0.5도 단위로 뭉뚱그려 저장
        "lon": round(round(entry.lon * 2) / 2, 1),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    _next_card_id += 1
    postcards.append(card)
    del postcards[:-MAX_POSTCARDS]  # 오래된 것부터 정리
    return card


@app.delete("/api/postcards/{card_id}", tags=["지도"])
def delete_postcard(card_id: int, x_admin_token: str | None = Header(default=None)):
    """관리용: 환경변수 ADMIN_TOKEN 이 설정돼 있고 헤더 X-Admin-Token 이 같을 때만 삭제됩니다."""
    admin = os.getenv("ADMIN_TOKEN")
    if not admin:
        raise HTTPException(status_code=403, detail="관리 기능이 꺼져 있습니다")
    if not x_admin_token or not secrets.compare_digest(x_admin_token, admin):
        raise HTTPException(status_code=403, detail="권한이 없습니다")
    for i, c in enumerate(postcards):
        if c["id"] == card_id:
            postcards.pop(i)
            return {"deleted": card_id}
    raise HTTPException(status_code=404, detail="없는 엽서입니다")
