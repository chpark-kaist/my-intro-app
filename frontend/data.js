// 지도와 관심사 카드에 쓰는 데이터.
// 위치는 도시 중심 좌표이며 사진의 실제 촬영 좌표가 아닙니다. 연도는 연 단위로만 표시합니다.
(() => {
  const I = (file, alt) => ({ type: "img", src: `media/img/${file}.webp`, alt });
  const V = (file, alt) => ({
    type: "vid",
    src: `media/vid/${file}.mp4`,
    poster: `media/vid/${file}.jpg`,
    alt,
  });

  // 시간순 (여정 선이 이 순서대로 이어집니다)
  window.TRIPS = [
    { id: "okinawa", year: 2017, place: "오키나와", country: "일본", lat: 26.21, lon: 127.68, tag: "여행", tz: "Asia/Tokyo",
      media: [I("okinawa-boat", "배 위에서 하늘을 올려다보는 모습")] },
    { id: "kenting", year: 2017, place: "컨딩", country: "대만", lat: 22.0, lon: 120.8, tag: "여행", tz: "Asia/Taipei",
      media: [V("taiwan-beach", "파라솔이 늘어선 해변 풍경"), I("taiwan-beach", "해변을 배경으로 놓인 맥주 두 병")] },
    { id: "mongolia", year: 2018, place: "몽골", country: "몽골", lat: 45.0, lon: 105.0, tag: "여행", tz: "Asia/Ulaanbaatar",
      media: [
        I("mn-road", "끝없이 뻗은 도로와 파란 하늘"),
        V("mn-convoy", "초원을 달리는 차량들"),
        I("mn-goat", "염소 옆에 쪼그려 앉아 웃는 모습"),
        I("mn-van", "구름 아래 서 있는 흰 밴"),
        I("mn-yurt", "유르트 앞에서 에어소파를 세우는 모습"),
        I("mn-canyon", "협곡 앞에서 찍은 셀카"),
        I("mn-badlands", "알록달록한 구릉 지대를 배경으로"),
        I("mn-hood", "후드를 쓰고 산 앞에서"),
        I("mn-stars", "은하수 아래 앉아 있는 사람들의 실루엣"),
      ] },
    { id: "osaka", year: 2018, place: "오사카", country: "일본", lat: 34.69, lon: 135.5, tag: "여행", tz: "Asia/Tokyo",
      media: [I("osaka-wheel", "붉게 빛나는 대관람차 야경"), I("osaka-night", "창밖 야경을 배경으로 한 셀카")] },
    { id: "tokyo", year: 2019, place: "도쿄", country: "일본", lat: 35.68, lon: 139.76, tag: "여행", tz: "Asia/Tokyo",
      media: [I("tokyo-shoebill", "넓적부리황새"), I("tokyo-gorilla", "수건을 뒤집어쓴 고릴라"), I("tokyo-ramen", "라멘 가게 입구")] },
    { id: "thailand", year: 2019, place: "방콕 · 칸차나부리", country: "태국", lat: 13.75, lon: 100.5, tag: "여행", tz: "Asia/Bangkok",
      media: [I("th-glass", "유리 바닥 전망대에서"), I("th-erawan", "국립공원 숲길의 안내 표지판")] },
    { id: "hoian", year: 2022, place: "다낭 · 호이안", country: "베트남", lat: 15.95, lon: 108.3, tag: "여행", tz: "Asia/Ho_Chi_Minh",
      media: [I("vn-flood", "물이 찬 거리에서 브이를 하는 모습")] },
    { id: "fukuoka", year: 2024, place: "후쿠오카", country: "일본", lat: 33.59, lon: 130.4, tag: "여행", tz: "Asia/Tokyo",
      media: [V("kyushu-train", "건널목을 지나는 붉은 열차"), I("fk-hotpot", "보글보글 끓는 전골")] },
    { id: "bali", year: 2024, place: "발리", country: "인도네시아", lat: -8.65, lon: 115.17, tag: "여행", tz: "Asia/Makassar",
      media: [I("bali-crossfit", "크로스핏 체육관 간판 앞에서")] },
    { id: "jeju", year: 2026, place: "제주", country: "한국", lat: 33.45, lon: 126.55, tag: "자전거", tz: "Asia/Seoul",
      media: [
        I("jeju-passport", "자전거길 인증 여권을 든 손"),
        I("jeju-bikes3", "난간에 세워 둔 접이식 자전거 두 대"),
        I("jeju-helmet", "헬멧을 쓰고 웃는 셀카"),
        I("jeju-bikes", "짐가방을 단 자전거들"),
        I("jeju-hat", "주황색 모자를 쓰고 바다 앞에서"),
        I("jeju-rain", "후드를 쓰고 바닷가에서"),
        I("jeju-sashimi", "한 상 가득 차려진 회 정식"),
      ] },
  ];

  // 관심사 카드 (배경 영상 + 사진 모음)
  window.INTERESTS = {
    run: {
      title: "러닝",
      media: [
        V("run-sea", "방파제 위에서 몸을 푸는 모습"),
        I("busan-run", "러닝을 마치고 찍은 셀카"),
        I("jeju-rain", "후드를 쓰고 바닷가에서"),
        I("bali-crossfit", "크로스핏 체육관 간판 앞에서"),
      ],
    },
    bike: {
      title: "자전거",
      media: [
        V("cycling-pov", "자전거 시점으로 본 숲길"),
        I("jeju-passport", "자전거길 인증 여권을 든 손"),
        I("jeju-bikes3", "난간에 세워 둔 접이식 자전거 두 대"),
        I("jeju-helmet", "헬멧을 쓰고 웃는 셀카"),
        I("jeju-bikes", "짐가방을 단 자전거들"),
      ],
    },
    travel: {
      title: "여행",
      media: [
        V("kyushu-train", "건널목을 지나는 붉은 열차"),
        I("mn-road", "끝없이 뻗은 도로와 파란 하늘"),
        I("mn-stars", "은하수 아래 앉아 있는 사람들의 실루엣"),
        I("osaka-wheel", "붉게 빛나는 대관람차 야경"),
        I("mn-badlands", "알록달록한 구릉 지대를 배경으로"),
        I("taiwan-beach", "해변을 배경으로 놓인 맥주 두 병"),
      ],
    },
  };
})();
