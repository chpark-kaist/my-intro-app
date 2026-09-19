# 박찬휘 개인 소개 페이지 & 프론트엔드·백엔드 연동

클라우드 컴퓨팅 수업 개인 과제입니다. 개인 소개 페이지(HTML)를 Vercel에 배포하고, FastAPI 백엔드를 Render에 배포한 뒤 프론트엔드에서 백엔드 API를 호출해 결과를 확인합니다.

## 배포 주소

| 구분 | 주소 |
| --- | --- |
| GitHub 저장소 | https://github.com/chpark-kaist/my-intro-app.git |
| 프론트엔드 (Vercel) | https://chanceintro.vercel.app |
| 백엔드 Swagger UI (Render) | https://my-intro-api.onrender.com/docs |

## 프로젝트 구성

```
my-intro-app/
├── frontend/            # 정적 웹 페이지 (Vercel 배포)
│   ├── index.html       # 개인 소개 페이지
│   ├── api-demo.html    # 프론트엔드·백엔드 연동 실습 페이지
│   ├── style.css        # 공통 스타일 (라이트/다크 테마)
│   ├── theme.js         # 테마 전환
│   └── api.js           # 백엔드 API 호출 (fetch)
├── backend/             # FastAPI 서버 (Render 배포)
│   ├── main.py
│   └── requirements.txt
├── .gitignore
└── README.md
```

## 주요 기능

- 개인 소개 페이지 (`index.html`): 소개, 프로필, 관심사, 링크
- 연동 실습 페이지 (`api-demo.html`): 백엔드 API 호출. 두 페이지는 서로 링크로 이동할 수 있습니다.
  - `GET /health` : 서버 상태 확인
  - `GET /api/hello?name=` : 인사 메시지
  - `GET /api/guestbook`, `POST /api/guestbook` : 방명록 조회/등록 (메모리 저장)
- 연동 실습 페이지에서 Swagger UI(`/docs`)로 이동하는 링크 제공

## 기술 스택

- Frontend: HTML, CSS, JavaScript (Vercel)
- Backend: Python, FastAPI, Uvicorn (Render)
- 소스 관리: Git, GitHub

## 로컬 실행 방법

```bash
# 백엔드
cd backend
python -m venv .venv
# Windows PowerShell: .venv\Scripts\Activate.ps1   /  macOS: source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
# http://127.0.0.1:8000/docs

# 프론트엔드: VS Code Live Server로 frontend/index.html 열기
# (localhost에서 열면 자동으로 로컬 백엔드 http://127.0.0.1:8000 을 호출합니다)
```

## 참고

- Render 무료 서버는 일정 시간 요청이 없으면 잠들어, 첫 요청에 30~60초가 걸릴 수 있습니다.
- 방명록 데이터는 메모리에 저장되므로 서버가 재시작되면 초기화됩니다.
- CORS 허용 도메인은 환경변수 `ALLOWED_ORIGINS`로 설정합니다 (기본값 `*`).
