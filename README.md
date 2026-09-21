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
│   ├── index.html       # 개인 소개 페이지 (인터랙티브 여행 지도 포함)
│   ├── api-demo.html    # 프론트엔드·백엔드 연동 실습 페이지
│   ├── style.css        # 공통 스타일 (라이트/다크 테마)
│   ├── intro.css        # 소개 페이지 전용 스타일
│   ├── extras.css       # 통계·엽서·빠른 이동·염소·AI 카드 스타일
│   ├── theme.js         # 테마 전환
│   ├── config.js        # 백엔드 주소(API_BASE)와 공통 fetch 도우미
│   ├── data.js          # 지도·관심사에 쓰는 여행/사진 데이터
│   ├── map-data.js      # 점 지도용 육지 격자 (Natural Earth, 퍼블릭 도메인)
│   ├── map.js           # 캔버스 점 지도, 핀, 여정 재생(비행기·자전거), 상세 패널
│   ├── trips-api.js     # 백엔드에서 여행 목록·통계를 받아 지도에 반영
│   ├── weather.js       # 핀 패널의 현지 시각 + 현재 날씨
│   ├── postcards.js     # 방문자 엽서 (지도에 핀으로 붙이기)
│   ├── palette.js       # Ctrl+K 빠른 이동
│   ├── goat.js          # 🐐 염소 이스터에그
│   ├── lightbox.js      # 사진/영상 크게 보기
│   ├── intro.js         # 스크롤 효과, 카드 틸트, 영상 자동 재생
│   ├── api.js           # 연동 실습 페이지의 API 호출 (fetch)
│   └── media/           # 웹용으로 줄인 사진(webp)과 영상(mp4), 링크 공유 이미지(og.jpg)
├── backend/             # FastAPI 서버 (Render 배포)
│   ├── main.py
│   └── requirements.txt
├── .gitignore
└── README.md
```

## 주요 기능

- 개인 소개 페이지 (`index.html`): 소개, 프로필, 관심사, 링크
  - 낮의 도로 / 밤의 은하수 히어로 (라이트·다크 테마 버튼으로 전환)
  - 인터랙티브 여행 지도: 핀을 누르면 사진·영상 패널, 여정 재생, 전체/아시아 보기
  - 러닝·자전거·여행 관심사 카드 (영상 배경, 클릭하면 사진 갤러리)
  - 스크롤하면 소실점으로 빨려 들어가는 도로 히어로, 여정 선을 따라 움직이는 비행기·자전거
  - 여행 통계, `Ctrl+K` 빠른 이동, 🐐 염소 이스터에그, "AI와 함께 만들었어요" 카드
- 연동 실습 페이지 (`api-demo.html`): 백엔드 API 호출. 두 페이지는 서로 링크로 이동할 수 있습니다.
- 연동 실습 페이지에서 Swagger UI(`/docs`)로 이동하는 링크 제공

## 백엔드 API

| 메서드 | 경로 | 설명 | 사용하는 곳 |
| --- | --- | --- | --- |
| GET | `/health` | 서버 상태 확인 | 연동 실습 |
| GET | `/api/hello?name=` | 인사 메시지 | 연동 실습 |
| GET/POST | `/api/guestbook` | 방명록 조회/등록 (메모리 저장) | 연동 실습 |
| GET | `/api/trips` | 여행 목록 + 통계(이어 붙인 직선거리, 지구 몇 바퀴, 가장 먼 구간) | 소개 페이지의 지도 |
| GET | `/api/weather?lat=&lon=` | 좌표의 현재 날씨. 서버가 무료 Open-Meteo API를 대신 호출하고(요청 제한 시 MET Norway로 대체) 10분간 캐시 | 지도의 핀 패널 |
| GET/POST | `/api/postcards` | 방문자 엽서 조회/등록. IP당 1분에 5장, 최대 200장 보관 | 지도의 엽서 핀 |
| DELETE | `/api/postcards/{id}` | 관리용 삭제. 환경변수 `ADMIN_TOKEN`과 헤더 `X-Admin-Token`이 같을 때만 동작 | Swagger에서 관리 |

소개 페이지는 서버가 잠들어 있거나 새 API가 없어도 페이지에 들어 있는 데이터로 그대로 동작합니다(서버 상태는 지도 아래 배지로 표시).

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
- 방명록과 엽서 데이터는 메모리에 저장되므로 서버가 재시작되면 초기화됩니다.
- CORS 허용 도메인은 환경변수 `ALLOWED_ORIGINS`로 설정합니다 (기본값 `*`).
- 엽서 삭제 기능은 Render 환경변수 `ADMIN_TOKEN`을 설정해야 켜집니다. 설정하지 않으면 삭제 요청은 항상 거부됩니다.
- 로컬에서 다른 백엔드를 시험하려면 `http://localhost:5500/?api=http://127.0.0.1:8001` 처럼 주소 뒤에 `?api=`를 붙입니다 (배포된 페이지에서는 무시됩니다).
- 사진과 영상은 웹용으로 줄이면서 촬영 위치(GPS) 등 메타데이터를 모두 제거했고, 영상의 소리도 제거했습니다.
  원본은 저장소에 올리지 않습니다(`.gitignore`). 지도의 핀 위치는 도시 단위의 대략적인 표시입니다.

## 여행 놀이터

관심사 아래의 여행 놀이터와 첫 화면의 바로가기에서 다음 기능을 열 수 있습니다.

- 여행지 맞히기: 5장의 사진을 보고 지도 또는 지역 목록으로 정답을 선택합니다. 거리는 여행 지역 대표 좌표 기준입니다.
- 랜덤 여행: 사진을 무작위로 뽑고 현지 날씨, 기존 지도와 사진·영상 갤러리로 연결합니다. 날씨 실패 시 사진은 계속 볼 수 있습니다.
- 사진 퍼즐: 기존 사진을 골라 3×3 조각을 두 개씩 교환하며 완성합니다.
- 염소 잡기: 사진 도둑 염소를 세 번 잡거나 바로 사진을 볼 수 있습니다.
- 사진 공간: 드래그·방향키·이동 버튼으로 기존 사진을 둘러보고 갤러리를 엽니다.

구현 파일은 frontend/playground.js, frontend/playground.css입니다. 새 사진, 계정, 데이터베이스는 필요하지 않습니다. 게임 점수는 서버에 저장하지 않습니다.