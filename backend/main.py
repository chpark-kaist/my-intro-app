import os
from datetime import datetime, timezone

from fastapi import FastAPI
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
