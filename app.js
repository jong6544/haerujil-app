/* ============================================================
   오류가 나면 화면에 바로 보이게 표시 (디버깅용)
============================================================ */
window.addEventListener('error', function (e) {
  var app = document.getElementById('app');
  if (!app) return;
  var box = document.createElement('div');
  box.style.cssText = 'background:#FBEBD3;color:#6B4310;padding:12px;border-radius:10px;margin-bottom:12px;font-size:13px;white-space:pre-wrap;border:1px solid #E3B879;';
  box.textContent = '오류 발생: ' + e.message + '  (' + (e.filename ? e.filename.split('/').pop() : '') + ':' + e.lineno + ')';
  app.prepend(box);
});

/* ============================================================
   설정값 — 아래 세 가지를 본인 값으로 바꿔주세요.
   1) index.html 안의 카카오맵 SDK 스크립트 태그에서 YOUR_KAKAO_JS_KEY 교체 (완료됨)
   2) 아래 TIDE_API_KEY: 공공데이터포털에서 받은 인증키(Decoding) (완료됨)
   3) 아래 OBS_CODES: 왕산(영종왕산)·영흥도·안흥 관측소의 정확한 코드(DT_xxxx)로 교체
      확인 방법: khoa.go.kr에서 제공하는 "조위관측소 운영 현황" 자료(공공데이터포털
      15146602)를 열어 "영종왕산", "영흥도", "안흥" 이름으로 검색하면 관측소 고유번호가
      나와요. 이 값을 채우기 전까지는 달력이 tideInfo()의 추정값으로 표시됩니다.
      (요청주소는 이번에 검색으로 확인했지만, 실제 응답 형식은 100% 확신할 수 없어서
       parseTideResponse()는 응답을 콘솔에 로그만 남기고 화면 표시는 아직 보수적으로
       처리해뒀습니다 — 실제 켜보시고 콘솔 로그를 알려주시면 화면 표시까지 마무리할게요.)
============================================================ */
var TIDE_API_KEY = 'IRsSSSvAIRJ8yzg/0FRHuB046Llj2SkN/PJxXUE4QFIuZgMJA8f30kbyruOLZVBJwxRIlejEIDht2efEcwCQzA==';
var YOUTUBE_API_KEY = 'AIzaSyC4T_z8ReHdhj1GySug8DC1n8085uLYL-U';
var TIDE_API_ENDPOINT = 'https://apis.data.go.kr/1192136/surveyTideLevel/GetSurveyTideLevelApiService';
var OBS_CODES = {
  wangsan: 'DT_0044',    // 영종대교 — 왕산에서 가장 가까운 관측소지만 정확히 같은 위치는 아니에요
  yeongheung: 'DT_0043', // 영흥도 — 정확히 일치
  taean: 'DT_0067',      // 안흥 — 정확히 일치 (DT_0034 "안흥(구)"는 예전 관측소라 제외)
  ganghwa: 'DT_0032',    // 강화대교 — 근접 관측소
  boryeong: 'DT_0025',   // 보령 — 정확히 일치
  jebu: 'DT_0008',       // 안산 — 근접 관측소 (제부도 전용 관측소는 없음)
  muui: 'DT_0093',       // 소무의도 — 정확히 일치
  daebu: 'DT_0008',      // 안산 — 근접 관측소 (제부도와 동일 관측소 공유)
  gochang: 'DT_0003',    // 영광 — 3km, 매우 근접
  sinan: 'DT_0007',      // 목포 — 약 30km, 신안 권역 대표 관측소
  buan: 'DT_0068',       // 위도 — 정확히 일치 (부안 본토 포인트는 근접치로 사용)
  muan: 'DT_0066'        // 향화도 — 5km, 매우 근접
};

/* ============================================================
   데이터 — 좌표는 대략적인 값입니다.
============================================================ */
var regions = {
  wangsan: {
    label: '왕산(영종도)', center: { lat: 37.4470, lng: 126.3700 }, level: 6,
    points: [
      { name: '왕산해수욕장', lat: 37.4559, lng: 126.3684, species: [{ name: '바지락', months: [3,4,5,6] }, { name: '동죽', months: [4,5,6,7] }, { name: '낙지', months: [9,10,11] }] },
      { name: '선녀바위', lat: 37.4397, lng: 126.3782, species: [{ name: '백합', months: [7,8] }, { name: '주꾸미', months: [9,10,11] }, { name: '소라', months: [5,6,7,8,9] }] },
      { name: '을왕리', lat: 37.4477, lng: 126.3725, species: [{ name: '소라', months: [5,6,7,8,9] }, { name: '박하지', months: [6,7,8] }] },
      { name: '마시안', lat: 37.4318, lng: 126.4166, species: [{ name: '바지락', months: [3,4,5,6] }, { name: '동죽', months: [4,5,6,7] }] }
    ],
    campsFormal: [
      { name: '왕산가족오토캠핑장', lat: 37.4585, lng: 126.3661, note: '왕산해수욕장 도보 1분, 카라반 구역 있음' },
      { name: '을왕리 솔트캠핑장', lat: 37.4573, lng: 126.3693, note: '차박 전용 구역·카라반 구역 분리, 주차 넉넉' }
    ],
    campsInformal: [
      { name: '을왕리 해변 노지 주차', lat: 37.4442, lng: 126.3705, note: '무료지만 만조 시 주차구역 침수 위험 — 물때 확인 후 높은 곳에 주차', caution: true }
    ],
    restaurants: [
      { name: '해송조개구이', note: '을왕리, 조개구이 · 야외 바다뷰 테이블', address: '인천 중구 용유서로423번길 25', lat: 37.4572347, lng: 126.3681260, url: 'https://xn--lu5b27g.xn--ok0b236bp0a.com/9atds7' },
      { name: '조개대표 을왕리직영점', note: '왕산해수욕장 인근, 모둠조개 세트', address: '인천 중구 을왕로 6', lat: 37.4458101, lng: 126.3750203, url: 'https://www.siksinhot.com/theme/magazine/7189' },
      { name: '마시안어부집', note: '마시안해변, 조개구이 전문', address: '인천 중구 마시란로 77', lat: 37.4292372, lng: 126.4182964, url: 'https://tour.click1-tip.com/entry/%EC%98%81%EC%A2%85%EB%8F%84-%EB%A7%9B%EC%A7%91-%EB%B2%A0%EC%8A%A4%ED%8A%B810' }
    ]
  },
  yeongheung: {
    label: '영흥도', center: { lat: 37.2350, lng: 126.4350 }, level: 7,
    points: [
      { name: '십리포해수욕장', lat: 37.2814, lng: 126.4859, species: [{ name: '낙지', months: [9,10,11] }, { name: '소라', months: [5,6,7,8,9] }, { name: '박하지', months: [6,7,8] }, { name: '갯가재', months: [6,7,8] }] },
      { name: '장경리해수욕장', lat: 37.2722, lng: 126.4494, species: [{ name: '바지락', months: [3,4,5,6] }, { name: '굴', months: [11,12,1,2] }] },
      { name: '노가리해변', lat: 37.239, lng: 126.471, species: [{ name: '키조개', months: [4,5,6] }, { name: '소라', months: [5,6,7,8,9] }, { name: '골뱅이', months: [3,4,5] }, { name: '꽃게', months: [4,5,9,10] }] }
    ],
    campsFormal: [
      { name: '십리포해수욕장 캠핑장', lat: 37.2814, lng: 126.4859, note: '정식 야영장, 유료' },
      { name: '캠프노마드', lat: 37.2635, lng: 126.4494, note: '카라반·오토캠핑, 수영장 있음' }
    ],
    campsInformal: [
      { name: '장경리해수욕장 노지', lat: 37.2722, lng: 126.4494, note: '예전엔 무료 노지캠핑 명소였으나 최근 단속 강화로 야영 금지구역 있음 — 방문 전 확인 필요', caution: true }
    ],
    restaurants: [
      { name: '영흥도 바지락 해물칼국수', note: '영흥대교 인근, 바지락·해물칼국수', address: '인천 옹진군 영흥면 영흥북로 195', lat: 37.2680198, lng: 126.4949854, url: 'https://xn--lu5b27g.xn--ok0b236bp0a.com/wSbEdM' },
      { name: '유명한집', note: '십리포해수욕장 앞, 해물칼국수', address: '인천 옹진군 영흥면 영흥북로 393', lat: 37.2809620, lng: 126.4853340, url: 'https://www.diningcode.com/profile.php?rid=XCwXrkmUIcTp' },
      { name: '본토바지락칼국수해장국', note: '바지락칼국수 평점 높음', address: '인천 옹진군 영흥면 내리 8-10', lat: 37.2559390, lng: 126.4986554, url: 'https://www.diningcode.com/list.dc?query=%EC%98%81%ED%9D%A5%EB%8F%84+%EC%B9%BC%EA%B5%AD%EC%88%98' }
    ]
  },
  taean: {
    label: '태안', center: { lat: 36.6500, lng: 126.2800 }, level: 8,
    points: [
      { name: '몽산포', lat: 36.6700, lng: 126.2868, species: [{ name: '바지락', months: [3,4,5,6] }, { name: '낙지', months: [9,10,11] }, { name: '개조개', months: [4,5,6,7] }, { name: '소라', months: [5,6,7,8,9] }] },
      { name: '청포대', lat: 36.6399, lng: 126.3015, species: [{ name: '백합', months: [7,8] }, { name: '대맛', months: [4,5,6,7,8,9,10] }, { name: '맛조개', months: [4,5,6,7,8,9] }] },
      { name: '방포해변', lat: 36.5094, lng: 126.3327, species: [{ name: '바지락', months: [3,4,5,6] }, { name: '소라', months: [5,6,7,8,9] }, { name: '맛조개', months: [4,5,6,7,8,9] }] },
      { name: '신두리', lat: 36.8374, lng: 126.1848, species: [{ name: '골뱅이', months: [3,4,5] }, { name: '동죽', months: [4,5,6,7] }, { name: '대맛', months: [4,5,6,7,8,9,10] }] }
    ],
    campsFormal: [
      { name: '몽산포 오토캠핑장', lat: 36.6700, lng: 126.2868, note: '전기·샤워장 완비, 1박 약 5만원' },
      { name: '마검포 아름뜰 캠핑장', lat: 36.6118, lng: 126.2903, note: '조용한 편, 해루질 포인트 인접' }
    ],
    campsInformal: [
      { name: '마검포항 노지', lat: 36.6230, lng: 126.2820, note: '무료 노지 차박, 방파제 안쪽 잔잔한 해변에서 낚시·해루질 병행 가능', caution: false },
      { name: '솔향기길 해안 차박지', lat: 36.9672, lng: 126.3042, note: '전기·수도 없음, 조용한 감성 차박지', caution: false }
    ],
    restaurants: [
      { name: '안흥식당', note: '태안읍, 장어조림·샤브샤브', address: '충남 태안군 태안읍 정주내2길 15', lat: 36.7467184, lng: 126.3059350, url: 'https://atlantak.com/%ED%95%9C%EA%B5%AD%EB%A7%9B%EC%A7%91-%EC%84%9C%ED%95%B4%EC%95%88-%ED%95%B4%EC%82%B0%EB%AC%BC-%EB%A7%9B%EC%A7%91-%EB%B2%A0%EC%8A%A4%ED%8A%B8-5/' },
      { name: '태안바지락해장국', note: '바지락 듬뿍, 시래기밥 리필 가능', address: '충남 태안군 태안읍 서해로 1952-5', lat: 36.7531881, lng: 126.3223740, url: 'https://www.diningcode.com/profile.php?rid=7voOBOeSkRiV' },
      { name: '몽산포먹거리수산', note: '몽산포, 갑오징어 등 활어회', address: '충남 태안군 몽대로 495-31', lat: 36.6728077, lng: 126.2734430, url: 'https://atlantak.com/%ED%95%9C%EA%B5%AD%EB%A7%9B%EC%A7%91-%EC%84%9C%ED%95%B4%EC%95%88-%ED%95%B4%EC%82%B0%EB%AC%BC-%EB%A7%9B%EC%A7%91-%EB%B2%A0%EC%8A%A4%ED%8A%B8-5/' }
    ]
  },
  ganghwa: {
    label: '강화도', center: { lat: 37.6200, lng: 126.4000 }, level: 9,
    points: [
      { name: '동막해변', lat: 37.5926, lng: 126.4582, species: [{ name: '바지락', months: [3,4,5,6] }, { name: '동죽', months: [4,5,6,7] }, { name: '칠게', months: [5,6,7,8,9] }, { name: '쌀무늬고둥', months: [4,5,6,7,8,9] }] },
      { name: '동검도', lat: 37.5880, lng: 126.5150, species: [{ name: '낙지', months: [9,10,11] }] },
      { name: '외포항', lat: 37.7055, lng: 126.3816, species: [{ name: '꽃게', months: [4,5,9,10] }, { name: '소라', months: [5,6,7,8,9] }] },
      { name: '초지대교 인근', lat: 37.6324, lng: 126.5404, species: [{ name: '바지락', months: [3,4,5,6] }, { name: '동죽', months: [4,5,6,7] }] },
      { name: '민머루해수욕장(석모도)', lat: 37.6514, lng: 126.3335, species: [{ name: '바지락', months: [3,4,5,6] }, { name: '고둥', months: [4,5,6,7,8,9] }] }
    ],
    campsFormal: [
      { name: '동막해변 야영장', lat: 37.5926, lng: 126.4582, note: '데크·노지 야영구역, 샤워장 있음(여름 성수기 유료 운영)' }
    ],
    campsInformal: [
      { name: '외포항 주변 노지', lat: 37.7055, lng: 126.3816, note: '석모도 여객선터미널 인근, 방문 전 주차·야영 가능 여부 확인 필요', caution: true }
    ],
    restaurants: [
      { name: '만복정', note: '강화풍물시장 2층, 밴댕이회·무침', address: '인천 강화군 강화읍 중앙로 17-9', lat: 37.7414806, lng: 126.4927278, url: 'https://busan7.com/entry/%EC%A0%84%ED%98%84%EB%AC%B4%EA%B3%84%ED%9A%8D2-%EA%B0%95%ED%99%94%EB%8F%84-%ED%92%8D%EB%AC%BC%EC%8B%9C%EC%9E%A5-%EB%82%B4-%EB%A7%9B%EC%A7%91-%EB%B0%B4%EB%8C%95%EC%9D%B4-%ED%95%9C%EC%83%81%F0%9F%90%9F' },
      { name: '일억조젓국갈비', note: '젓국갈비, 반찬 푸짐', address: '인천 강화군 강화읍 동문안길21번길 17', lat: 37.7476823, lng: 126.4851367, url: 'https://www.diningcode.com/profile.php?rid=fFex0fKgLBxg' },
      { name: '금문도', note: '짜장면·탕수육(강화 순무 활용)', address: '인천 강화군 길상면 강화동로 187', lat: 37.6560265, lng: 126.4928351, url: 'https://www.diningcode.com/profile.php?rid=UqC1x3iUsoZ8' },
      { name: '용흥궁식당', note: '젓국갈비 평점 높음', address: '인천 강화군 강화읍 동문안길21번길 22', lat: 37.7478655, lng: 126.4848819, url: 'https://www.diningcode.com/list.dc?query=%EA%B0%95%ED%99%94%EB%8F%84++%EC%88%9C%EB%AC%B4%EA%B9%80%EC%B9%98' }
    ]
  },
  boryeong: {
    label: '보령·서천', center: { lat: 36.3300, lng: 126.5000 }, level: 9,
    points: [
      { name: '무창포해수욕장', lat: 36.2445, lng: 126.5366, species: [{ name: '굴', months: [11,12,1,2] }, { name: '바지락', months: [3,4,5,6] }, { name: '고둥', months: [4,5,6,7,8,9] }, { name: '골뱅이', months: [3,4,5] }, { name: '홍합', months: [3,4,5,6] }] },
      { name: '독산해수욕장', lat: 36.2225, lng: 126.5309, species: [{ name: '바지락', months: [3,4,5,6] }, { name: '동죽', months: [4,5,6,7] }] },
      { name: '대천해수욕장', lat: 36.3056, lng: 126.5160, species: [{ name: '바지락', months: [3,4,5,6] }, { name: '동죽', months: [4,5,6,7] }] }
    ],
    campsFormal: [
      { name: '독산해수욕장 야영장·오토캠핑장', lat: 36.2225, lng: 126.5309, note: '소나무 방풍림, 정식 시설' }
    ],
    campsInformal: [
      { name: '무창포 인근 노지', lat: 36.2445, lng: 126.5366, note: '신비의 바닷길(석대도) 개방 시간에 맞춰 방문 — 물때 확인 필수', caution: true }
    ],
    restaurants: [
      { name: '수정식당', note: '대천, 밴댕이·갈치 조림', address: '충남 보령시', lat: 36.3449047, lng: 126.5984825, url: 'https://brunch.co.kr/@savvyoon/1579' },
      { name: '유정식당', note: '서천, 꽃게무침·간장게장', address: '충남 서천군', lat: 36.0106397, lng: 126.6970492, url: 'https://atlantak.com/%ED%95%9C%EA%B5%AD%EB%A7%9B%EC%A7%91-%EC%84%9C%ED%95%B4%EC%95%88-%ED%95%B4%EC%82%B0%EB%AC%BC-%EB%A7%9B%EC%A7%91-%EB%B2%A0%EC%8A%A4%ED%8A%B8-5/' }
    ]
  },
  jebu: {
    label: '제부도·궁평항', center: { lat: 37.2000, lng: 126.6500 }, level: 9,
    points: [
      { name: '제부도해변', lat: 37.1655, lng: 126.6173, species: [{ name: '바지락', months: [3,4,5,6] }, { name: '쏙(쏙새우)', months: [4,5,6] }, { name: '낙지', months: [9,10,11] }, { name: '갯지렁이', months: [4,5,6,7,8,9] }] },
      { name: '궁평항', lat: 37.1155, lng: 126.6773, species: [{ name: '바지락', months: [3,4,5,6] }, { name: '동죽', months: [4,5,6,7] }, { name: '꽃게', months: [4,5,9,10] }] }
    ],
    campsFormal: [],
    campsInformal: [
      { name: '제부도 진입 전 주차장 인근', lat: 37.2000, lng: 126.6180, note: '바닷길 통행시간(물때)에 따라 입·출도 가능 여부가 달라짐 — 반드시 사전 확인', caution: true }
    ],
    restaurants: [
      { name: '매바위횟집', note: '제부도, 조개칼국수·해물파전', address: '경기 화성시 서신면 해안길 230-1', lat: 37.1617848, lng: 126.6185324, url: 'https://www.diningcode.com/profile.php?rid=hhJIhrtbWo8z' },
      { name: '소라횟집', note: '제부리, 조개구이·조개찜 패키지', address: '경기 화성시 서신면 제부리 190-22', lat: 37.1608002, lng: 126.6187658, url: 'https://korean.visitkorea.or.kr/detail/rem_detail.do?cotid=b38c76a0-5789-4c3e-9248-411cd09d1a48' },
      { name: '서울회집', note: '제부리, 활어회', address: '경기 화성시 서신면 제부리 20-11', lat: 37.1691378, lng: 126.6286325, url: 'https://korean.visitkorea.or.kr/detail/rem_detail.do?cotid=b38c76a0-5789-4c3e-9248-411cd09d1a48' }
    ]
  },
  muui: {
    label: '무의도', center: { lat: 37.3846, lng: 126.4093 }, level: 9,
    points: [
      { name: '하나개해수욕장', lat: 37.3846, lng: 126.4093, species: [{ name: '동죽', months: [4,5,6,7] }, { name: '소라', months: [5,6,7,8,9] }, { name: '방게', months: [5,6,7,8] }, { name: '바지락', months: [3,4,5,6] }, { name: '백합', months: [7,8] }, { name: '주꾸미', months: [9,10,11] }] }
    ],
    campsFormal: [
      { name: '하나개해수욕장 야영지', lat: 37.3846, lng: 126.4093, note: '취사 가능, 방갈로 있음' }
    ],
    campsInformal: [],
    restaurants: [
      { name: '무의도 하나개 조개구이', note: '하나개해수욕장, 조개찜·칼국수', address: '인천 중구 하나개로 144-19', lat: 37.3830388, lng: 126.4104581, url: 'https://www.diningcode.com/profile.php?rid=uSu7DmlOK5V5' },
      { name: '어부네', note: '하나개해수욕장, 바지락·해물칼국수', address: '인천 중구 무의동 산189', lat: 37.3847137, lng: 126.4107800, url: 'https://www.diningcode.com/profile.php?rid=9HaqVphjaF3W' },
      { name: '황금손해물칼국수 무의점', note: '백합칼국수', address: '인천 중구 대무의로 309-17', lat: 37.3888848, lng: 126.4265426, url: 'https://www.diningcode.com/profile.php?rid=SK1aGClRwgfi' }
    ]
  },
  daebu: {
    label: '대부도', center: { lat: 37.2450, lng: 126.5900 }, level: 9,
    points: [
      { name: '방아머리해수욕장', lat: 37.2892, lng: 126.5765, species: [{ name: '바지락', months: [3,4,5,6] }, { name: '동죽', months: [4,5,6,7] }, { name: '게', months: [5,6,7,8,9] }, { name: '고둥', months: [4,5,6,7,8,9] }, { name: '꽃게', months: [4,5,9,10] }, { name: '망둥어', months: [6,7,8,9,10] }] },
      { name: '탄도항', lat: 37.1924, lng: 126.6450, species: [{ name: '바지락', months: [3,4,5,6] }, { name: '동죽', months: [4,5,6,7] }] }
    ],
    campsFormal: [],
    campsInformal: [
      { name: '방아머리 인근 바다향기테마파크 노지캠핑지', lat: 37.2832, lng: 126.5781, note: '무료, 여러 대가 함께 캠핑 가능(떼캠 명소), 화장실 있음', caution: false }
    ],
    restaurants: [
      { name: '문성5호', note: '대부도 유일 민어탕 전문점', address: '경기 안산시 단원구 대부황금로 1209', lat: 37.2659844, lng: 126.5770349, url: 'https://busan7.com/entry/%EC%A0%84%ED%98%84%EB%AC%B4%EA%B3%84%ED%9A%8D2-%EA%B0%95%ED%99%94%EB%8F%84-%ED%92%8D%EB%AC%BC%EC%8B%9C%EC%9E%A5-%EB%82%B4-%EB%A7%9B%EC%A7%91-%EB%B0%B4%EB%8C%95%EC%9D%B4-%ED%95%9C%EC%83%81%F0%9F%90%9F' },
      { name: '대갓집해물왕창칼국수', note: '방아머리 먹거리타운, 해물칼국수', address: '경기 안산시 단원구 대부황금로 1463', lat: 37.2860122, lng: 126.5724375, url: 'https://triple.guide/attractions/7ecf9e61-9193-4fcf-b842-fe645ad08deb' },
      { name: '사또조개구이', note: '방아머리, 활어회+조개구이 코스', address: '경기 안산시 단원구 대부황금로 1479', lat: 37.2867896, lng: 126.5736141, url: 'https://www.siksinhot.com/theme/magazine/11421' }
    ]
  },
  gochang: {
    label: '고창', center: { lat: 35.4500, lng: 126.4400 }, level: 9,
    points: [
      { name: '구시포해변', lat: 35.4453, lng: 126.4349, species: [{ name: '백합', months: [4,5,6,7,8,9,10] }, { name: '바지락', months: [4,5,6,7,8,9,10] }, { name: '동죽', months: [4,5,6,7] }] },
      { name: '상하해변', lat: 35.4471, lng: 126.4517, species: [{ name: '바지락', months: [4,5,6,7,8,9,10] }, { name: '맛조개', months: [4,5,6,7,8,9] }, { name: '동죽', months: [4,5,6,7] }, { name: '낙지', months: [9,10,11] }] }
    ],
    campsFormal: [
      { name: '구시포 노을캠핑장', lat: 35.4391, lng: 126.4338, note: '구시포해변 바로 앞, 오토캠핑존·카라반 가능, 전기·샤워장 완비' }
    ],
    campsInformal: [],
    restaurants: [
      { name: '장어장터', note: '구시포해변, 풍천장어·칼국수', address: '전북 고창군 상하면 자룡리 (구시포해변길 12-1)', lat: 35.4465875, lng: 126.4364389, url: 'https://www.diningcode.com/profile.php?rid=B6rMHgnD5OEZ' },
      { name: '구시포하우스', note: '구시포, 쭈꾸미·백합칼국수, 오션뷰', address: '전북 고창군 상하면 자룡리 520-19', lat: 35.4469642, lng: 126.4367410, url: 'https://www.diningcode.com/profile.php?rid=oQDgck8GmJ1H' }
    ]
  },
  sinan: {
    label: '신안(증도)', center: { lat: 34.9712, lng: 126.1367 }, level: 10,
    points: [
      { name: '우전해변', lat: 34.9712, lng: 126.1367, species: [{ name: '바지락', months: [3,4,5,6] }, { name: '동죽', months: [4,5,6,7] }, { name: '고둥', months: [4,5,6,7,8,9] }] }
    ],
    campsFormal: [],
    campsInformal: [
      { name: '우전해변 인근 노지', lat: 34.9712, lng: 126.1367, note: '짱뚱어해변 방향 도보 이동, 성수기 외 샤워장 미운영 — 신안군이 조례로 지정한 공식 갯벌축제장이라 해루질 자체는 문제없음. 개인 소비량만 채취하고 특정 구역 어촌계 표시가 있으면 그 구역만 피할 것', caution: false }
    ],
    restaurants: [
      { name: '이학식당', note: '증도, 짱뚱어탕·낙지비빔밥', address: '전남 신안군 증도면 증도중앙길 39', lat: 35.0010181, lng: 126.1396314, url: 'https://www.diningcode.com/profile.php?rid=IsFGr0va3xiZ' },
      { name: '전주식당', note: '지도읍, 짱뚱어탕(증도에서 차로 이동 필요)', address: '전남 신안군 지도읍 읍내리 815-2', lat: 35.0564161, lng: 126.2036575, url: 'https://www.diningcode.com/profile.php?rid=vSl5wMpEFnU0' }
    ]
  },
  buan: {
    label: '부안', center: { lat: 35.6600, lng: 126.4200 }, level: 9,
    points: [
      { name: '변산해수욕장', lat: 35.6813, lng: 126.5316, species: [{ name: '바지락', months: [3,4,5,6] }, { name: '소라', months: [5,6,7,8,9] }, { name: '동죽', months: [4,5,6,7] }] },
      { name: '고사포해변', lat: 35.6627, lng: 126.5087, species: [{ name: '개조개', months: [4,5,6,7] }, { name: '맛조개', months: [4,5,6,7,8,9] }, { name: '동죽', months: [4,5,6,7] }, { name: '바지락', months: [3,4,5,6] }] },
      { name: '위도', lat: 35.5977, lng: 126.2827, species: [{ name: '바지락', months: [3,4,5,6] }, { name: '소라', months: [5,6,7,8,9] }, { name: '낙지', months: [9,10,11] }] }
    ],
    campsFormal: [
      { name: '변산오토캠핑장', lat: 35.6821, lng: 126.5338, note: '변산해수욕장 도보 200m, 카라반 5대·개인카라반 사이트 29면' }
    ],
    campsInformal: [],
    restaurants: [
      { name: '변산명인바지락죽', note: '변산해변, 인삼바지락죽·바지락회비빔밥', address: '전북 부안군 변산면 변산해변로 794', lat: 35.6645597, lng: 126.5134049, url: 'https://v.daum.net/v/zovkV7g2ZT' },
      { name: '김인경 바지락죽', note: '변산, 바지락죽·조개파전(원조바지락죽으로도 불림)', address: '전북 부안군 변산면 대항리 90-12', lat: 35.6916239, lng: 126.5648265, url: 'https://www.clien.net/service/board/kin/15199037' },
      { name: '계화회관', note: '계화면, 백합죽·백합정식(변산에서 차로 이동)', address: '전북 부안군 행안면 변산로 95', lat: 35.7290676, lng: 126.7106686, url: 'https://www.clien.net/service/board/kin/15199037' }
    ]
  },
  muan: {
    label: '무안', center: { lat: 35.1300, lng: 126.3400 }, level: 10,
    points: [
      { name: '현경면 갯벌', lat: 35.1037, lng: 126.3330, species: [{ name: '낙지', months: [9,10,11] }, { name: '바지락', months: [3,4,5,6] }] },
      { name: '송계어촌체험마을', lat: 35.1533, lng: 126.3400, species: [{ name: '바지락', months: [3,4,5,6] }, { name: '소라', months: [5,6,7,8,9] }, { name: '고둥', months: [4,5,6,7,8,9] }] }
    ],
    campsFormal: [],
    campsInformal: [
      { name: '송계어촌체험마을 인근 노지', lat: 35.1533, lng: 126.3400, note: '무료 노지 차박 명소로 알려져 있으나 성수기엔 매우 붐빔, 화장실 관리 상태 사전 확인 권장', caution: true }
    ],
    restaurants: [
      { name: '윤희네뻘낙지', note: '무안읍 낙지골목, 낙지탕탕이·낙지볶음', address: '전남 무안군 무안읍 성남1길 167', lat: 34.9873465, lng: 126.4767110, url: 'https://daddy331.kdo1.kr/entry/%EB%AC%B4%EC%95%88-%EB%A7%9B%EC%A7%91-%EB%B2%A0%EC%8A%A4%ED%8A%B810-%EC%A7%80%EA%B8%88-%EB%9C%A8%EB%8A%94-%EA%B3%B3' }
    ]
  }
};

var inactiveMarkers = [];

var regulatedSpecies = ['낙지', '꽃게', '소라', '백합', '키조개', '주꾸미'];

var regInfo = {
  '낙지': '금어기 6.1~6.30 (인천·경기 지역은 6.21~7.20으로 별도 적용)',
  '꽃게': '금어기 6.21~8.20, 두흉갑장 6.4cm 이하 포획 금지',
  '소라': '금어기 6.1~8.31, 각고 5cm 이하 금지 (서해 소라는 종 확인이 필요할 수 있음)',
  '백합': '금어기 7.1~8.20, 각장 5cm 이하 금지',
  '키조개': '금어기 7.1~8.31, 각장 약 18cm 이하 금지',
  '주꾸미': '금어기 5.11~8.31'
};

/* ============================================================
   상태 저장 (localStorage)
============================================================ */
function loadState(key, fallback) {
  try {
    var raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) { return fallback; }
}
function saveState(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
}

var catchLog = loadState('haerujil.catchLog', {});
var savedVideos = loadState('haerujil.videos', null);
if (!savedVideos) savedVideos = [];
var cleanedVideos = savedVideos.filter(function (v) { return v.url; });
if (cleanedVideos.length !== savedVideos.length) {
  savedVideos = cleanedVideos;
  saveState('haerujil.videos', savedVideos);
}
var customPoints = loadState('haerujil.customPoints', {});

/* ============================================================
   앱 상태
============================================================ */
var tabRegion = { map: null, camp: null, calendar: null };
var currentTab = 'map';
var today = new Date();
var calYear = today.getFullYear();
var calMonth = today.getMonth();
var selectedDate = null;
var selectMap = null;
var regionMap = null;
var campMap = null;

function focusMap(map, mapElId, lat, lng) {
  if (!map) return;
  map.setLevel(4);
  map.setCenter(new kakao.maps.LatLng(lat, lng));
  var mapEl = document.getElementById(mapElId);
  if (mapEl) mapEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function attachFocusHandlers(el, getMap, mapElId) {
  Array.prototype.forEach.call(el.querySelectorAll('[data-lat]'), function (card) {
    card.addEventListener('click', function () {
      focusMap(getMap(), mapElId, parseFloat(card.getAttribute('data-lat')), parseFloat(card.getAttribute('data-lng')));
    });
  });
}
var kakaoOk = (typeof kakao !== 'undefined');

/* ============================================================
   카카오맵 헬퍼
============================================================ */
function withKakao(callback, mapEl) {
  if (!kakaoOk) {
    if (mapEl) {
      mapFallback(mapEl, window.kakaoScriptFailed
        ? '카카오맵을 불러오지 못했어요. 오늘 사용량을 다 썼거나 키에 문제가 있을 수 있어요.'
        : '지도를 불러오지 못했어요. index.html의 카카오 JavaScript 키를 확인해주세요.');
    }
    return;
  }
  var settled = false;
  var timer = setTimeout(function () {
    if (settled) return;
    settled = true;
    if (mapEl) mapFallback(mapEl, '지도 응답이 없어요. 오늘 카카오맵 사용량을 다 썼을 수 있어요 — 내일 다시 시도해주세요.');
  }, 6000);
  kakao.maps.load(function () {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    callback();
  });
}

function addLabeledMarker(map, lat, lng, label, muted, onClick) {
  var pos = new kakao.maps.LatLng(lat, lng);
  new kakao.maps.Marker({ position: pos, map: map });
  var el = document.createElement('div');
  el.textContent = label;
  el.style.cssText = 'background:#fff;border:1px solid ' + (muted ? '#DCD0BA' : '#2F6E73') +
    ';color:' + (muted ? '#4B5B57' : '#1D4A4F') +
    ';font-size:12px;padding:2px 8px;border-radius:10px;white-space:nowrap;transform:translate(-50%,-38px);cursor:' +
    (onClick ? 'pointer' : 'default') + ';';
  var overlay = new kakao.maps.CustomOverlay({ position: pos, content: el, yAnchor: 1 });
  overlay.setMap(map);
  if (onClick) el.addEventListener('click', onClick);
}

function addCustomMarker(map, lat, lng, label) {
  var pos = new kakao.maps.LatLng(lat, lng);
  new kakao.maps.Marker({ position: pos, map: map });
  var el = document.createElement('div');
  el.textContent = '⭐ ' + label;
  el.style.cssText = 'background:var(--rust);border:none;color:#fff;font-size:12px;padding:2px 8px;' +
    'border-radius:10px;white-space:nowrap;transform:translate(-50%,-38px);';
  var overlay = new kakao.maps.CustomOverlay({ position: pos, content: el, yAnchor: 1 });
  overlay.setMap(map);
}

function mapFallback(container, msg) {
  container.innerHTML = '<div style="height:100%;display:flex;align-items:center;justify-content:center;' +
    'padding:16px;text-align:center;color:var(--ink-soft);font-size:13px;">' + msg + '</div>';
}

/* ============================================================
   물때 · 일출일몰 (추정치 — 실제 API 연동 전 임시 표시용)
============================================================ */
function tideInfo(day) {
  var m = day % 15;
  var label, cls;
  if (m <= 1 || m >= 13) { label = '사리'; cls = 'sari'; }
  else if (m >= 6 && m <= 9) { label = '조금'; cls = 'jogeum'; }
  else { label = '중물'; cls = 'jung'; }
  var sunriseMin = 358 + Math.floor(day / 2);
  var sunsetMin = 1122 - Math.floor(day / 2);
  function fmt(min) {
    var h = Math.floor(min / 60), mm = min % 60;
    return (h < 10 ? '0' : '') + h + ':' + (mm < 10 ? '0' : '') + mm;
  }
  return { label: label, cls: cls, sunrise: fmt(sunriseMin), sunset: fmt(sunsetMin) };
}

function ymdFromDateStr(dateStr) {
  var parts = dateStr.split('-');
  return parts[0] + (parts[1].length < 2 ? '0' + parts[1] : parts[1]) + (parts[2].length < 2 ? '0' + parts[2] : parts[2]);
}

/* ============================================================
   정확한 일출·일몰·월출·월몰 (한국천문연구원 출몰시각 정보)
   지역명 기반 API라 우리 8개 지역이 속한 시·군 이름으로 추정해서
   넣었어요. 응답에 지역을 못 찾겠다는 에러가 뜨면 이름을 바꿔야 해요.
============================================================ */
var ASTRO_API_KEY = TIDE_API_KEY;
var ASTRO_API_ENDPOINT = 'https://apis.data.go.kr/B090041/openapi/service/RiseSetInfoService/getAreaRiseSetInfo';
var REGION_LOCATION_NAMES = {
  wangsan: '인천', yeongheung: '인천', taean: '태안', ganghwa: '강화',
  boryeong: '보령', jebu: '화성', muui: '인천', daebu: '안산',
  gochang: '고창', sinan: '신안', buan: '부안', muan: '무안'
};
var astroCache = {};
function fetchSunMoon(regionKey, dateStr) {
  if (typeof fetch === 'undefined') return Promise.resolve(null);
  if (!ASTRO_API_KEY || ASTRO_API_KEY.indexOf('YOUR_') === 0) return Promise.resolve(null);
  var loc = REGION_LOCATION_NAMES[regionKey];
  if (!loc) return Promise.resolve(null);
  var cacheKey = regionKey + '|' + dateStr;
  if (astroCache[cacheKey]) return astroCache[cacheKey];
  var url = ASTRO_API_ENDPOINT + '?serviceKey=' + encodeURIComponent(ASTRO_API_KEY) +
    '&locdate=' + ymdFromDateStr(dateStr) + '&location=' + encodeURIComponent(loc);
  var p = fetch(url).then(function (res) { return res.ok ? res.json() : null; })
    .then(function (data) { if (data) console.log('일출일몰 API 응답(콘솔 확인용)', data); return data; })
    .catch(function () { return null; });
  astroCache[cacheKey] = p;
  return p;
}

function formatTimeField(raw) {
  if (!raw) return null;
  var s = String(raw);
  if (s.length < 4) return null;
  return s.slice(0, 2) + ':' + s.slice(2, 4);
}

function parseSunMoon(data) {
  try {
    var item = (data.body && data.body.items && data.body.items.item) ||
      (data.items && data.items.item) || null;
    if (Array.isArray(item)) item = item[0];
    if (!item) return null;
    var sunrise = formatTimeField(item.sunrise);
    var sunset = formatTimeField(item.sunset);
    var moonrise = formatTimeField(item.moonrise);
    var moonset = formatTimeField(item.moonset);
    if (!sunrise || !sunset) return null;
    return { sunrise: sunrise, sunset: sunset, moonrise: moonrise, moonset: moonset };
  } catch (e) { return null; }
}

var tideCache = {};
function fetchRealTide(regionKey, dateStr) {
  if (typeof fetch === 'undefined') return Promise.resolve(null);
  if (!TIDE_API_ENDPOINT || TIDE_API_ENDPOINT.indexOf('YOUR_') === 0 || TIDE_API_KEY.indexOf('YOUR_') === 0) {
    return Promise.resolve(null);
  }
  var obsCode = OBS_CODES[regionKey];
  if (!obsCode || obsCode.indexOf('YOUR_') === 0) return Promise.resolve(null);
  var cacheKey = regionKey + '|' + dateStr;
  if (tideCache[cacheKey]) return tideCache[cacheKey];
  var url = TIDE_API_ENDPOINT + '?serviceKey=' + encodeURIComponent(TIDE_API_KEY) +
    '&type=json&obsCode=' + obsCode + '&reqDate=' + ymdFromDateStr(dateStr) +
    '&min=5&numOfRows=300&pageNo=1';
  var p = fetch(url).then(function (res) { return res.ok ? res.json() : null; })
    .then(function (data) { if (data) console.log('물때 API 응답(콘솔 확인용)', data); return data; })
    .catch(function () { return null; });
  tideCache[cacheKey] = p;
  return p;
}

/* Swagger 명세로 확인된 실제 응답 구조: body.items.item[] 안에
   obsrvnDt(관측일시), tdlvHgt(조위값) 필드가 들어있습니다. */
function extractTideExtremes(data) {
  try {
    var series = data.body.items.item;
    if (!series || series.length < 3) return null;
    var points = series.map(function (p) {
      return { time: p.obsrvnDt, level: Number(p.tdlvHgt) };
    }).filter(function (p) { return p.time && !isNaN(p.level); });
    if (points.length < 3) return null;
    var extremes = [];
    for (var i = 1; i < points.length - 1; i++) {
      var prev = points[i - 1].level, cur = points[i].level, next = points[i + 1].level;
      var lastType = extremes.length ? extremes[extremes.length - 1].type : null;
      if (cur >= prev && cur >= next && lastType !== 'high') {
        extremes.push({ type: 'high', time: points[i].time, level: cur });
      } else if (cur <= prev && cur <= next && lastType !== 'low') {
        extremes.push({ type: 'low', time: points[i].time, level: cur });
      }
    }
    return extremes.length ? extremes : null;
  } catch (e) { return null; }
}

function formatHm(recordTime) {
  var m = recordTime.match(/(\d{2}):(\d{2})/);
  return m ? m[1] + ':' + m[2] : recordTime;
}

/* ============================================================
   유튜브 관련 영상 검색 (지역별로 한 번만 검색해서 캐시)
============================================================ */
var ytCache = {};
function fetchYouTubeSearch(query) {
  if (typeof fetch === 'undefined') return Promise.resolve({ results: [], error: null });
  if (!YOUTUBE_API_KEY || YOUTUBE_API_KEY.indexOf('YOUR_') === 0) return Promise.resolve({ results: [], error: null });
  if (ytCache[query]) return ytCache[query];
  var url = 'https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=5&q=' +
    encodeURIComponent(query) + '&key=' + YOUTUBE_API_KEY;
  var p = fetch(url).then(function (res) {
    return res.json().catch(function () { return null; }).then(function (body) {
      return { ok: res.ok, status: res.status, body: body };
    });
  }).then(function (wrapped) {
    if (wrapped.ok && wrapped.body && wrapped.body.items) {
      return {
        results: wrapped.body.items.map(function (it) {
          return { videoId: it.id.videoId, title: it.snippet.title, thumb: it.snippet.thumbnails.medium.url };
        }),
        error: null
      };
    }
    var reason = null;
    try { reason = wrapped.body.error.errors[0].reason; } catch (e) {}
    var errorType = (reason === 'quotaExceeded' || reason === 'dailyLimitExceeded') ? 'quota' : 'other';
    return { results: [], error: errorType };
  }).catch(function () { return { results: [], error: 'network' }; });
  ytCache[query] = p;
  return p;
}

/* ============================================================
   날씨 (기상청 단기예보) — 오늘부터 최대 2~3일치만 제공됩니다.
   공공데이터포털 계정이 같으면 물때 API와 같은 인증키를 그대로 쓸 수
   있는 경우가 많아 TIDE_API_KEY를 재사용했어요. 안 되면 기상청 단기예보
   조회서비스를 별도로 활용신청한 뒤 발급받은 키로 WEATHER_API_KEY 값만
   바꿔주세요.
============================================================ */
var WEATHER_API_KEY = TIDE_API_KEY;
var WEATHER_API_ENDPOINT = 'https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst';
var gridCache = {};

function latLngToGrid(lat, lng) {
  var RE = 6371.00877, GRID = 5.0, SLAT1 = 30.0, SLAT2 = 60.0, OLON = 126.0, OLAT = 38.0, XO = 43, YO = 136;
  var DEGRAD = Math.PI / 180.0;
  var re = RE / GRID;
  var slat1 = SLAT1 * DEGRAD, slat2 = SLAT2 * DEGRAD, olon = OLON * DEGRAD, olat = OLAT * DEGRAD;
  var sn = Math.tan(Math.PI * 0.25 + slat2 * 0.5) / Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn);
  var sf = Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sf = Math.pow(sf, sn) * Math.cos(slat1) / sn;
  var ro = Math.tan(Math.PI * 0.25 + olat * 0.5);
  ro = re * sf / Math.pow(ro, sn);
  var ra = Math.tan(Math.PI * 0.25 + lat * DEGRAD * 0.5);
  ra = re * sf / Math.pow(ra, sn);
  var theta = lng * DEGRAD - olon;
  if (theta > Math.PI) theta -= 2.0 * Math.PI;
  if (theta < -Math.PI) theta += 2.0 * Math.PI;
  theta *= sn;
  var x = Math.floor(ra * Math.sin(theta) + XO + 0.5);
  var y = Math.floor(ro - ra * Math.cos(theta) + YO + 0.5);
  return { nx: x, ny: y };
}

function regionGrid(regionKey) {
  if (!gridCache[regionKey]) {
    var c = regions[regionKey].center;
    gridCache[regionKey] = latLngToGrid(c.lat, c.lng);
  }
  return gridCache[regionKey];
}

function latestBaseTime() {
  var times = ['0200', '0500', '0800', '1100', '1400', '1700', '2000', '2300'];
  var now = new Date();
  var hm = (now.getHours() < 10 ? '0' : '') + now.getHours() + (now.getMinutes() < 10 ? '0' : '') + now.getMinutes();
  var chosen = null, baseDate = now;
  for (var i = 0; i < times.length; i++) { if (hm >= times[i]) chosen = times[i]; }
  if (!chosen) { chosen = times[times.length - 1]; baseDate = new Date(now.getTime() - 24 * 3600 * 1000); }
  var y = baseDate.getFullYear(), m = baseDate.getMonth() + 1, d = baseDate.getDate();
  return { date: '' + y + (m < 10 ? '0' : '') + m + (d < 10 ? '0' : '') + d, time: chosen };
}

function parseWeather(data, targetDateStr) {
  try {
    var items = data.response.body.items.item;
    var parts = targetDateStr.split('-');
    var ymd = parts[0] + (parts[1].length < 2 ? '0' + parts[1] : parts[1]) + (parts[2].length < 2 ? '0' + parts[2] : parts[2]);
    var sky = [], pty = [], wsd = [], pop = [];
    items.forEach(function (it) {
      if (it.fcstDate !== ymd) return;
      if (it.category === 'SKY') sky.push(Number(it.fcstValue));
      if (it.category === 'PTY') pty.push(Number(it.fcstValue));
      if (it.category === 'WSD') wsd.push(Number(it.fcstValue));
      if (it.category === 'POP') pop.push(Number(it.fcstValue));
    });
    if (!sky.length && !pty.length) return null;
    return {
      pty: pty.length ? Math.max.apply(null, pty) : 0,
      sky: sky.length ? sky[Math.floor(sky.length / 2)] : 1,
      wsd: wsd.length ? Math.max.apply(null, wsd) : null,
      pop: pop.length ? Math.max.apply(null, pop) : null
    };
  } catch (e) { return null; }
}

function weatherIcon(w) {
  if (w.pty === 1 || w.pty === 4) return '🌧️';
  if (w.pty === 2) return '🌨️';
  if (w.pty === 3) return '❄️';
  if (w.sky === 1) return '☀️';
  if (w.sky === 3) return '⛅';
  return '☁️';
}

var weatherRawCache = {};
function getWeatherRaw(regionKey) {
  if (typeof fetch === 'undefined') return Promise.resolve(null);
  if (!WEATHER_API_KEY || WEATHER_API_KEY.indexOf('YOUR_') === 0) return Promise.resolve(null);
  var bt = latestBaseTime();
  var cacheKey = regionKey + '|' + bt.date + '|' + bt.time;
  if (weatherRawCache[cacheKey]) return weatherRawCache[cacheKey];
  var grid = regionGrid(regionKey);
  var url = WEATHER_API_ENDPOINT + '?serviceKey=' + encodeURIComponent(WEATHER_API_KEY) +
    '&numOfRows=1000&pageNo=1&dataType=JSON&base_date=' + bt.date + '&base_time=' + bt.time +
    '&nx=' + grid.nx + '&ny=' + grid.ny;
  var p = fetch(url).then(function (res) { return res.ok ? res.json() : null; })
    .then(function (data) { if (data) console.log('날씨 API 응답(콘솔 확인용)', data); return data; })
    .catch(function () { return null; });
  weatherRawCache[cacheKey] = p;
  return p;
}

function fetchWeather(regionKey, dateStr) {
  return getWeatherRaw(regionKey).then(function (data) {
    if (!data) return null;
    return parseWeather(data, dateStr);
  });
}

/* ============================================================
   전체 다시 그리기
============================================================ */
function renderAll() {
  renderRegionBar();
  renderContent();
  renderTabbar();
}

/* ============================================================
   상단 도구줄 — 항상 보임 (내보내기/불러오기)
============================================================ */
function exportData() {
  var payload = { catchLog: catchLog, savedVideos: savedVideos, exportedAt: new Date().toISOString() };
  var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'haerujil-backup-' + Date.now() + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function importDataFromFile(file) {
  var reader = new FileReader();
  reader.onload = function () {
    try {
      var payload = JSON.parse(String(reader.result));
      if (payload.catchLog) { catchLog = payload.catchLog; saveState('haerujil.catchLog', catchLog); }
      if (payload.savedVideos) { savedVideos = payload.savedVideos; saveState('haerujil.videos', savedVideos); }
      renderAll();
      window.alert('불러오기 완료했어요.');
    } catch (e) {
      window.alert('이 파일을 읽을 수 없어요. 내보내기로 저장한 파일인지 확인해주세요.');
    }
  };
  reader.readAsText(file);
}

function renderMoreTab(el) {
  el.innerHTML =
    '<div class="section-label">설정</div>' +
    '<div class="camp-card"><div class="camp-card-title">📦 데이터 백업</div>' +
    '<div class="camp-card-note" style="margin-bottom:10px;">채집 기록과 저장한 영상을 파일로 저장하거나, 저장해둔 파일에서 불러올 수 있어요.</div>' +
    '<div style="display:flex;gap:8px;">' +
    '<button class="pill-btn" id="export-btn">내보내기</button>' +
    '<label class="pill-btn" id="import-label" style="cursor:pointer;">불러오기' +
    '<input type="file" id="import-input" accept="application/json" style="display:none;"></label>' +
    '</div></div>' +
    '<p class="no-log" style="margin-top:14px;">앞으로 설정이나 다른 기능이 추가되면 이 탭에 계속 모아둘게요.</p>';
  document.getElementById('export-btn').addEventListener('click', exportData);
  document.getElementById('import-input').addEventListener('change', function (e) {
    if (e.target.files && e.target.files[0]) importDataFromFile(e.target.files[0]);
  });
}

/* ============================================================
   상단 지역 표시줄 (항상 보임)
============================================================ */
function renderRegionBar() {
  var el = document.getElementById('region-bar');
  if (currentTab !== 'map' && currentTab !== 'camp') {
    el.innerHTML = '';
    return;
  }
  var key = tabRegion[currentTab];
  if (!key) {
    el.innerHTML = '';
    return;
  }
  var r = regions[key];
  el.innerHTML = '<div class="region-topbar">' +
    '<span class="region-name">' + r.label + '</span>' +
    '<button class="pill-btn" id="change-region">지역 변경</button></div>';
  document.getElementById('change-region').addEventListener('click', function () {
    tabRegion[currentTab] = null;
    renderAll();
  });
}

/* ============================================================
   콘텐츠 영역
============================================================ */
function renderContent() {
  var el = document.getElementById('content-area');
  if (currentTab === 'map') {
    if (!tabRegion.map) renderNationalMap(el);
    else renderRegionMap(el);
    return;
  }
  if (currentTab === 'camp') {
    if (!tabRegion.camp) { renderRegionPrompt(el); return; }
    renderCampTab(el);
    return;
  }
  if (currentTab === 'calendar') { renderCalendarTab(el); return; }
  if (currentTab === 'videos') { renderVideosTab(el); return; }
  if (currentTab === 'more') { renderMoreTab(el); return; }
}

function renderRegionPrompt(el) {
  el.innerHTML = '<p class="no-log" style="margin-bottom:14px;">이 탭을 보려면 먼저 지역을 선택해주세요.</p>' +
    Object.keys(regions).map(function (key) {
      return '<button class="region-pick-btn" data-pick="' + key + '">📍 ' + regions[key].label + '</button>';
    }).join('');
  Array.prototype.forEach.call(el.querySelectorAll('[data-pick]'), function (b) {
    b.addEventListener('click', function () {
      tabRegion[currentTab] = b.getAttribute('data-pick');
      renderAll();
    });
  });
}

/* ============================================================
   해루질 지도 탭
============================================================ */
function monthLabel(months) {
  var sorted = months.slice().sort(function (a, b) { return a - b; });
  var runs = [];
  var start = sorted[0], prev = sorted[0];
  for (var i = 1; i < sorted.length; i++) {
    if (sorted[i] === prev + 1) { prev = sorted[i]; continue; }
    runs.push([start, prev]);
    start = sorted[i]; prev = sorted[i];
  }
  runs.push([start, prev]);
  return runs.map(function (r) { return r[0] === r[1] ? r[0] + '월' : r[0] + '~' + r[1] + '월'; }).join(', ');
}

function isInSeason(months, m) { return months.indexOf(m) >= 0; }

function speciesRow(sp, nowMonth) {
  var inSeason = isInSeason(sp.months, nowMonth);
  var reg = regulatedSpecies.indexOf(sp.name) >= 0;
  var nameHtml = reg
    ? '<button data-reg-info="' + sp.name + '" style="border:none;background:none;padding:6px 0;margin:-6px 0;font:inherit;cursor:pointer;color:' + (inSeason ? 'var(--ink)' : 'var(--ink-soft)') + ';font-weight:' + (inSeason ? '700' : '400') + ';">' + sp.name + ' ⓘ</button>'
    : '<span style="color:' + (inSeason ? 'var(--ink)' : 'var(--ink-soft)') + ';font-weight:' + (inSeason ? '700' : '400') + ';">' + sp.name + '</span>';
  var rightHtml = '<span style="font-size:12px;color:' + (inSeason ? 'var(--tide)' : 'var(--ink-soft)') + ';">' +
    (inSeason ? '지금 제철 · ' : '') + monthLabel(sp.months) + '</span>';
  return '<div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid var(--line);font-size:14px;">' +
    nameHtml + rightHtml + '</div>';
}

function attachRegInfoHandlers(el) {
  var detail = document.getElementById('reg-detail');
  Array.prototype.forEach.call(el.querySelectorAll('[data-reg-info]'), function (b) {
    b.addEventListener('click', function () {
      var sp = b.getAttribute('data-reg-info');
      if (detail) detail.textContent = '⚠ ' + sp + ' — ' + (regInfo[sp] || '정확한 규정은 지자체 확인이 필요해요.');
    });
  });
}

function renderNationalMap(el) {
  el.innerHTML =
    '<div id="monthly-rec" class="camp-card"><p class="no-log">이번 달 추천 계산 중…</p></div>' +
    '<div class="map-box" id="select-map"></div>' +
    '<p class="map-hint">점을 탭하면 그 지역으로 들어갑니다. 회색 점은 아직 정보가 없는 지역이에요.</p>';

  loadMonthlyRecommendation(el);

  var mapEl = document.getElementById('select-map');
  withKakao(function () {
    var center = new kakao.maps.LatLng(37.0, 126.45);
    selectMap = new kakao.maps.Map(mapEl, { center: center, level: 13 });
    Object.keys(regions).forEach(function (key) {
      var r = regions[key];
      addLabeledMarker(selectMap, r.center.lat, r.center.lng, r.label, false, function () {
        tabRegion.map = key;
        renderAll();
      });
    });
    inactiveMarkers.forEach(function (m) {
      addLabeledMarker(selectMap, m.lat, m.lng, m.label, true, null);
    });
  }, mapEl);
}

/* ============================================================
   이번 달 추천 — 실제 API로 31일×8지역을 다 훑으면 너무 오래 걸려서,
   먼저 추정 물때로 '사리'에 해당하는 후보일만 추려낸 다음, 그 날들만
   8개 지역 실제 데이터를 조회해 간조가 가장 낮은(=가장 많이 빠지는)
   지역·날짜를 찾습니다. 하루 한 번만 계산하고 결과를 저장해둬요.
============================================================ */
function sariCandidateDays(year, month) {
  var daysInMonth = new Date(year, month + 1, 0).getDate();
  var days = [];
  for (var d = 1; d <= daysInMonth; d++) {
    if (tideInfo(d).cls === 'sari') days.push(d);
  }
  return days;
}

function computeMonthlyBest(year, month) {
  var days = sariCandidateDays(year, month);
  var regionKeys = Object.keys(regions);
  var results = [];
  var chain = Promise.resolve();
  days.forEach(function (d) {
    var dStr = year + '-' + (month + 1) + '-' + d;
    regionKeys.forEach(function (rk) {
      chain = chain.then(function () {
        return fetchRealTide(rk, dStr).then(function (data) {
          if (!data) return;
          var extremes = extractTideExtremes(data);
          if (!extremes) return;
          var lows = extremes.filter(function (e) { return e.type === 'low'; });
          lows.forEach(function (low) {
            results.push({ date: dStr, day: d, region: rk, time: low.time, level: low.level });
          });
        });
      });
    });
  });
  return chain.then(function () { return results; });
}

var monthlyRecComputing = false;
function loadMonthlyRecommendation(el) {
  var monthKey = calYear + '-' + (calMonth + 1);
  var saved = loadState('haerujil.monthlyRec', null);
  if (saved && saved.monthKey === monthKey && saved.top && saved.top.length) {
    renderMonthlyRecCard(el, saved.top);
    return;
  }
  if (monthlyRecComputing) return;
  monthlyRecComputing = true;
  computeMonthlyBest(calYear, calMonth).then(function (results) {
    monthlyRecComputing = false;
    if (!results.length) {
      var box = el.querySelector('#monthly-rec');
      if (box) box.innerHTML = '<p class="no-log">이번 달 추천을 계산하지 못했어요 (실제 물때 데이터를 못 가져왔어요).</p>';
      return;
    }
    results.sort(function (a, b) { return a.level - b.level; });
    var top = results.slice(0, 3);
    saveState('haerujil.monthlyRec', { monthKey: monthKey, top: top });
    renderMonthlyRecCard(el, top);
  });
}

function renderMonthlyRecCard(el, top) {
  var box = el.querySelector('#monthly-rec');
  if (!box) return;
  var best = top[0];
  var monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
  box.innerHTML =
    '<div class="camp-card-title">⭐ 이번 달 추천 — ' + best.day + '일 ' + regions[best.region].label + '</div>' +
    '<div class="camp-card-note">간조 ' + formatHm(best.time) + ' · 이번 달 중 물이 가장 많이 빠지는 날이에요.</div>' +
    (top.length > 1 ? '<div class="camp-card-note" style="margin-top:6px;">그 밖의 후보: ' +
      top.slice(1).map(function (t) { return t.day + '일 ' + regions[t.region].label; }).join(', ') + '</div>' : '') +
    '<button class="btn" id="monthly-rec-go" style="margin-top:10px;">' + best.day + '일 ' + regions[best.region].label + ' 캘린더 보기</button>';
  var goBtn = box.querySelector('#monthly-rec-go');
  if (!goBtn) return;
  goBtn.addEventListener('click', function () {
    tabRegion.calendar = best.region;
    calYear = parseInt(best.date.split('-')[0], 10);
    calMonth = parseInt(best.date.split('-')[1], 10) - 1;
    selectedDate = best.date;
    currentTab = 'calendar';
    renderAll();
  });
}

function myPointsHtml() {
  var mine = customPoints[tabRegion.map] || [];
  var html = '<div class="section-label">내가 추가한 포인트</div>';
  if (mine.length === 0) html += '<p class="no-log">아직 추가한 포인트가 없어요.</p>';
  else html += mine.map(function (p, idx) {
    return '<div class="camp-card" data-lat="' + p.lat + '" data-lng="' + p.lng + '" style="display:flex;justify-content:space-between;align-items:flex-start;cursor:pointer;">' +
      '<div><div class="camp-card-title">⭐ ' + p.name + '</div>' +
      (p.memo ? '<div class="camp-card-note">' + p.memo + '</div>' : '') + '</div>' +
      '<button data-del-mypoint="' + idx + '" aria-label="포인트 삭제" style="background:none;border:none;color:var(--ink-soft);font-size:16px;padding:4px 6px;flex-shrink:0;">✕</button></div>';
  }).join('');
  html += '<input class="field" id="mypoint-name" type="text" placeholder="이름 (예: 뒷개 갯벌)">' +
    '<input class="field" id="mypoint-memo" type="text" placeholder="메모 (선택)">' +
    '<p class="error-text hidden" id="mypoint-error">이름을 입력하고, 위치 접근을 허용해주세요.</p>' +
    '<button class="btn" id="mypoint-save">📍 현재 위치로 내 포인트 추가</button>';
  return html;
}

function attachMyPointsHandlers(el) {
  Array.prototype.forEach.call(el.querySelectorAll('[data-del-mypoint]'), function (b) {
    b.addEventListener('click', function (e) {
      e.stopPropagation();
      if (!window.confirm('이 포인트를 삭제할까요?')) return;
      var idx = parseInt(b.getAttribute('data-del-mypoint'), 10);
      customPoints[tabRegion.map].splice(idx, 1);
      saveState('haerujil.customPoints', customPoints);
      renderRegionMap(el);
    });
  });
  var saveBtn = document.getElementById('mypoint-save');
  if (!saveBtn) return;
  saveBtn.addEventListener('click', function () {
    var name = document.getElementById('mypoint-name').value.trim();
    var memo = document.getElementById('mypoint-memo').value.trim();
    var err = document.getElementById('mypoint-error');
    if (!name) { err.textContent = '이름을 입력해주세요.'; err.classList.remove('hidden'); return; }
    if (!navigator.geolocation) { err.textContent = '이 브라우저에서는 위치 확인을 지원하지 않아요.'; err.classList.remove('hidden'); return; }
    err.classList.add('hidden');
    saveBtn.textContent = '위치 확인 중…';
    navigator.geolocation.getCurrentPosition(function (pos) {
      if (!customPoints[tabRegion.map]) customPoints[tabRegion.map] = [];
      customPoints[tabRegion.map].push({ name: name, memo: memo, lat: pos.coords.latitude, lng: pos.coords.longitude });
      saveState('haerujil.customPoints', customPoints);
      renderRegionMap(el);
    }, function () {
      err.textContent = '위치를 가져오지 못했어요. 위치 권한을 허용했는지 확인해주세요.';
      err.classList.remove('hidden');
      saveBtn.textContent = '📍 현재 위치로 내 포인트 추가';
    });
  });
}

function renderRegionMap(el) {
  var r = regions[tabRegion.map];
  var nowMonth = today.getMonth() + 1;
  el.innerHTML =
    '<div class="point-map" id="region-map"></div>' +
    '<p style="font-size:12px;color:var(--ink-soft);margin:0 0 10px;">' + nowMonth + '월 기준으로 지금 제철인 어종이 위로 정렬돼요.</p>' +
    r.points.map(function (p) {
      var sorted = p.species.slice().sort(function (a, b) {
        var aIn = isInSeason(a.months, nowMonth) ? 0 : 1;
        var bIn = isInSeason(b.months, nowMonth) ? 0 : 1;
        return aIn - bIn;
      });
      return '<div class="point-card" data-lat="' + p.lat + '" data-lng="' + p.lng + '" style="cursor:pointer;"><div class="point-card-title">📍 ' + p.name + '</div>' +
        sorted.map(function (sp) { return speciesRow(sp, nowMonth); }).join('') + '</div>';
    }).join('') +
    '<p id="reg-detail" class="camp-card-note" style="min-height:18px;"></p>' +
    myPointsHtml() +
    '<div class="section-label">관련 영상</div>' +
    '<div id="yt-results"><p class="no-log">영상을 찾는 중…</p></div>';

  attachRegInfoHandlers(el);
  attachMyPointsHandlers(el);
  attachFocusHandlers(el, function () { return regionMap; }, 'region-map');
  loadRelatedVideos(el, r.label);

  var mapEl = document.getElementById('region-map');
  withKakao(function () {
    var center = new kakao.maps.LatLng(r.center.lat, r.center.lng);
    regionMap = new kakao.maps.Map(mapEl, { center: center, level: r.level });
    r.points.forEach(function (p) {
      addLabeledMarker(regionMap, p.lat, p.lng, p.name, false, null);
    });
    (customPoints[tabRegion.map] || []).forEach(function (p) {
      addCustomMarker(regionMap, p.lat, p.lng, p.name);
    });
  }, mapEl);
}

function loadRelatedVideos(el, regionLabel) {
  fetchYouTubeSearch(regionLabel + ' 해루질').then(function (res) {
    var box = el.querySelector('#yt-results');
    if (!box) return;
    if (res.error === 'quota') {
      box.innerHTML = '<p class="no-log">오늘 유튜브 검색 할당량을 다 썼어요. 내일 다시 시도해주세요.</p>';
      return;
    }
    if (res.error) {
      box.innerHTML = '<p class="no-log">영상을 불러오지 못했어요. index.html·app.js의 유튜브 키를 확인해주세요.</p>';
      return;
    }
    var results = res.results;
    if (!results.length) {
      box.innerHTML = '<p class="no-log">관련 영상을 찾지 못했어요.</p>';
      return;
    }
    box.innerHTML = results.map(function (v, idx) {
      return '<div class="video-card" data-yt-idx="' + idx + '" style="cursor:pointer;">' +
        '<img src="' + v.thumb + '" alt="" style="width:88px;height:66px;object-fit:cover;border-radius:8px;flex-shrink:0;">' +
        '<div class="video-info" style="flex:1;min-width:0;"><p class="video-title">' + v.title + '</p></div>' +
        '<button data-yt-save="' + idx + '" aria-label="영상 저장" style="background:none;border:none;color:var(--tide);font-size:22px;padding:4px 8px;flex-shrink:0;">＋</button>' +
        '</div>';
    }).join('');
    Array.prototype.forEach.call(box.querySelectorAll('[data-yt-idx]'), function (card) {
      card.addEventListener('click', function (e) {
        if (e.target.closest('[data-yt-save]')) return;
        var idx = parseInt(card.getAttribute('data-yt-idx'), 10);
        var v = results[idx];
        card.innerHTML = '<iframe width="100%" height="180" src="https://www.youtube.com/embed/' + v.videoId +
          '?autoplay=1" title="' + v.title + '" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen style="border-radius:8px;"></iframe>';
        card.style.cursor = 'default';
      });
    });
    Array.prototype.forEach.call(box.querySelectorAll('[data-yt-save]'), function (b) {
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        var idx = parseInt(b.getAttribute('data-yt-save'), 10);
        var v = results[idx];
        savedVideos.push({ title: v.title, region: regionLabel, species: '-', url: 'https://www.youtube.com/watch?v=' + v.videoId });
        saveState('haerujil.videos', savedVideos);
        b.textContent = '✓';
        b.disabled = true;
      });
    });
  });
}

/* ============================================================
   캠핑지도 탭
============================================================ */
function renderCampTab(el) {
  var r = regions[tabRegion.camp];
  var html = '<div class="point-map" id="camp-map"></div>' +
    '<div class="section-label">정식 캠핑장</div>';
  html += r.campsFormal.map(function (c) {
    var geo = c.lat != null ? ' data-lat="' + c.lat + '" data-lng="' + c.lng + '" style="cursor:pointer;"' : '';
    return '<div class="camp-card"' + geo + '><div class="camp-card-title">⛺ ' + c.name + '</div>' +
      '<div class="camp-card-note">' + c.note + '</div></div>';
  }).join('');
  html += '<div class="section-label">차박·노지 스팟</div>';
  html += r.campsInformal.map(function (c) {
    var warn = c.caution ? '<span class="badge reg" style="cursor:default;">주의</span>' : '';
    var geo = c.lat != null ? ' data-lat="' + c.lat + '" data-lng="' + c.lng + '" style="cursor:pointer;"' : '';
    return '<div class="camp-card"' + geo + '><div class="camp-card-title">🚐 ' + c.name + warn + '</div>' +
      '<div class="camp-card-note">' + c.note + '</div></div>';
  }).join('');
  if (r.restaurants && r.restaurants.length) {
    html += '<div class="section-label">주변 맛집</div>';
    html += r.restaurants.map(function (f, idx) {
      var naviUrl = 'https://map.kakao.com/link/to/' + encodeURIComponent(f.name) + ',' + f.lat + ',' + f.lng;
      return '<div class="camp-card" data-lat="' + f.lat + '" data-lng="' + f.lng + '" style="cursor:pointer;">' +
        '<div class="camp-card-title">🍽️ ' + f.name + '</div>' +
        '<div class="camp-card-note">' + f.note + '</div>' +
        '<div class="camp-card-note" style="margin-top:4px;">' + f.address + '</div>' +
        '<div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;">' +
        '<button data-copy-addr="' + idx + '" class="pill-btn" style="cursor:pointer;">주소 복사</button>' +
        '<a data-navi href="' + naviUrl + '" target="_blank" rel="noopener" class="pill-btn" style="text-decoration:none;">길찾기</a>' +
        '<a href="' + f.url + '" target="_blank" rel="noopener" class="pill-btn" style="text-decoration:none;">리뷰 보기</a>' +
        '</div></div>';
    }).join('');
  }
  el.innerHTML = html;
  attachFocusHandlers(el, function () { return campMap; }, 'camp-map');
  Array.prototype.forEach.call(el.querySelectorAll('[data-copy-addr]'), function (b) {
    b.addEventListener('click', function (e) {
      e.stopPropagation();
      var idx = parseInt(b.getAttribute('data-copy-addr'), 10);
      var addr = r.restaurants[idx].address;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(addr).then(function () {
          b.textContent = '복사됨';
          setTimeout(function () { b.textContent = '주소 복사'; }, 1500);
        }).catch(function () { window.prompt('아래 주소를 직접 복사해주세요', addr); });
      } else {
        window.prompt('아래 주소를 직접 복사해주세요', addr);
      }
    });
  });
  Array.prototype.forEach.call(el.querySelectorAll('[data-navi]'), function (a) {
    a.addEventListener('click', function (e) { e.stopPropagation(); });
  });

  var mapEl = document.getElementById('camp-map');
  withKakao(function () {
    var center = new kakao.maps.LatLng(r.center.lat, r.center.lng);
    campMap = new kakao.maps.Map(mapEl, { center: center, level: r.level });
    r.campsFormal.forEach(function (c) {
      if (c.lat != null) addLabeledMarker(campMap, c.lat, c.lng, c.name, false, null);
    });
    r.campsInformal.forEach(function (c) {
      if (c.lat != null) addLabeledMarker(campMap, c.lat, c.lng, c.name, true, null);
    });
    (r.restaurants || []).forEach(function (f) {
      addLabeledMarker(campMap, f.lat, f.lng, f.name, true, null);
    });
  }, mapEl);
}

/* ============================================================
   캘린더 탭
============================================================ */
function dateKey(d) { return calYear + '-' + (calMonth + 1) + '-' + d; }
function logKey(dStr) { return tabRegion.calendar + '|' + dStr; }

function monthlySummaryHtml() {
  var totals = {};
  Object.keys(catchLog).forEach(function (key) {
    if (key.indexOf(tabRegion.calendar + '|') !== 0) return;
    var dStr = key.slice(tabRegion.calendar.length + 1);
    var dp = dStr.split('-');
    if (parseInt(dp[0], 10) !== calYear || parseInt(dp[1], 10) !== (calMonth + 1)) return;
    catchLog[key].forEach(function (l) {
      if (l.qty == null || l.qty === '') return;
      var unit = l.unit || '';
      if (!totals[l.species]) totals[l.species] = {};
      totals[l.species][unit] = (totals[l.species][unit] || 0) + Number(l.qty);
    });
  });
  var sp = Object.keys(totals);
  if (!sp.length) return '';
  var html = '<div class="section-label">이번 달 채집 요약</div>';
  html += sp.map(function (s) {
    var units = totals[s];
    var parts = Object.keys(units).map(function (u) { return units[u] + u; });
    return '<div class="log-entry">' + s + ' · ' + parts.join(', ') + '</div>';
  }).join('');
  return html;
}

function renderCalendarTab(el) {
  if (!tabRegion.calendar) tabRegion.calendar = Object.keys(regions)[0];
  var chipsHtml = Object.keys(regions).map(function (key) {
    var active = key === tabRegion.calendar;
    return '<button class="pill-btn" data-region-chip="' + key + '" style="margin:0 6px 10px 0;' +
      (active ? 'background:var(--tide);color:#fff;border-color:var(--tide);' : '') + '">' + regions[key].label + '</button>';
  }).join('');
  var first = new Date(calYear, calMonth, 1);
  var startIdx = first.getDay();
  var daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  var monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

  var html = '<div style="margin-bottom:4px;">' + chipsHtml + '</div>' +
    '<div class="cal-header">' +
    '<button id="prev-month" aria-label="이전 달">‹</button>' +
    '<span class="cal-title">' + calYear + '년 ' + monthNames[calMonth] + '</span>' +
    '<button id="next-month" aria-label="다음 달">›</button></div>';

  html += '<p style="font-size:11px;color:var(--ink-soft);margin:0 0 6px;">칸 색이 진할수록 물이 많이 빠져요. ⭐는 이 달 중 가장 좋은 날. 위=일출, 아래=일몰.</p>';
  html += '<div class="cal-grid">';
  ['일', '월', '화', '수', '목', '금', '토'].forEach(function (d) { html += '<div class="cal-dow">' + d + '</div>'; });
  for (var i = 0; i < startIdx; i++) html += '<div></div>';
  for (var d = 1; d <= daysInMonth; d++) {
    var t = tideInfo(d);
    var dStr = dateKey(d);
    var hasLog = catchLog[logKey(dStr)] && catchLog[logKey(dStr)].length > 0;
    var sel = selectedDate === dStr;
    var isToday = calYear === today.getFullYear() && calMonth === today.getMonth() && d === today.getDate();
    html += '<button class="cal-day' + (sel ? ' selected' : '') + (isToday ? ' today' : '') + '" data-date="' + dStr + '" ' +
      'style="background:#F1EFE8">' +
      '<span class="d-num">' + d + '</span>' +
      '<span class="d-row"><span class="d-tide">' + t.label + '</span>' + (hasLog ? '<span class="d-dot"></span>' : '') + '</span>' +
      '<span class="d-sun d-sunrise">' + t.sunrise + '</span>' +
      '<span class="d-sun d-sunset">' + t.sunset + '</span>' +
      '</button>';
  }
  html += '</div>';
  html += monthlySummaryHtml();
  html += '<div id="day-detail"></div>';
  el.innerHTML = html;

  document.getElementById('prev-month').addEventListener('click', function () {
    calMonth--; if (calMonth < 0) { calMonth = 11; calYear--; } renderCalendarTab(el);
  });
  document.getElementById('next-month').addEventListener('click', function () {
    calMonth++; if (calMonth > 11) { calMonth = 0; calYear++; } renderCalendarTab(el);
  });
  Array.prototype.forEach.call(el.querySelectorAll('[data-region-chip]'), function (b) {
    b.addEventListener('click', function () {
      tabRegion.calendar = b.getAttribute('data-region-chip');
      selectedDate = null;
      renderRegionBar();
      renderCalendarTab(el);
    });
  });
  Array.prototype.forEach.call(el.querySelectorAll('[data-date]'), function (b) {
    b.addEventListener('click', function () { selectedDate = b.getAttribute('data-date'); renderCalendarTab(el); });
  });
  if (selectedDate) renderDayDetail();
  decorateCalendarWeather(el);
  decorateCalendarTide(el);
}

function mixColor(c1, c2, ratio) {
  function hexToRgb(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
  var a = hexToRgb(c1), b = hexToRgb(c2);
  var r = Math.round(a[0] + (b[0] - a[0]) * ratio);
  var g = Math.round(a[1] + (b[1] - a[1]) * ratio);
  var bl = Math.round(a[2] + (b[2] - a[2]) * ratio);
  return 'rgb(' + r + ',' + g + ',' + bl + ')';
}

function decorateCalendarTide(el) {
  var buttons = Array.prototype.slice.call(el.querySelectorAll('[data-date]'));
  var collected = [];
  var chain = Promise.resolve();
  buttons.forEach(function (btn) {
    chain = chain.then(function () {
      return fetchRealTide(tabRegion.calendar, btn.getAttribute('data-date')).then(function (data) {
        if (!data) return;
        var extremes = extractTideExtremes(data);
        if (!extremes) return;
        var low = extremes.filter(function (e) { return e.type === 'low'; })[0];
        if (!low) return;
        var label = btn.querySelector('.d-tide');
        if (label) label.textContent = '↓' + formatHm(low.time);
        collected.push({ btn: btn, level: low.level });
      });
    });
  });
  chain.then(function () {
    if (collected.length < 3) return;
    var levels = collected.map(function (c) { return c.level; });
    var min = Math.min.apply(null, levels), max = Math.max.apply(null, levels);
    var span = max - min;
    var starredIdx = {};
    for (var i = 0; i < levels.length; i++) {
      var prevLevel = i > 0 ? levels[i - 1] : Infinity;
      var nextLevel = i < levels.length - 1 ? levels[i + 1] : Infinity;
      if (levels[i] <= prevLevel && levels[i] <= nextLevel) {
        starredIdx[i] = true;
        if (i > 0) starredIdx[i - 1] = true;
        if (i < levels.length - 1) starredIdx[i + 1] = true;
      }
    }
    collected.forEach(function (c, idx) {
      var ratio = span > 0 ? (c.level - min) / span : 0;
      c.btn.style.background = mixColor('#5FA89E', '#F5F0E4', ratio);
      var label = c.btn.querySelector('.d-tide');
      if (label && starredIdx[idx]) label.textContent = '⭐' + label.textContent;
    });
  });
}

function decorateCalendarWeather(el) {
  getWeatherRaw(tabRegion.calendar).then(function (data) {
    if (!data) return;
    Array.prototype.forEach.call(el.querySelectorAll('[data-date]'), function (btn) {
      if (btn.querySelector('.d-weather')) return;
      var row = btn.querySelector('.d-row');
      if (!row) return;
      var dStr = btn.getAttribute('data-date');
      var w = parseWeather(data, dStr);
      if (!w) return;
      var span = document.createElement('span');
      span.className = 'd-weather';
      span.textContent = weatherIcon(w);
      row.appendChild(span);
    });
  });
}

function mascotForCls(cls) {
  if (cls === 'sari') return 'mascot-sari.png';
  if (cls === 'jogeum') return 'mascot-jogeum.png';
  return 'mascot-jungmul.png';
}

function renderDayDetail() {
  var el = document.getElementById('day-detail');
  if (!el || !selectedDate) return;
  var parts = selectedDate.split('-');
  var d = parseInt(parts[2], 10);
  var t = tideInfo(d);
  var r = regions[tabRegion.calendar];
  var allSpecies = [];
  r.points.forEach(function (p) { p.species.forEach(function (s) { if (allSpecies.indexOf(s.name) < 0) allSpecies.push(s.name); }); });

  var key = logKey(selectedDate);
  var logs = catchLog[key] || [];

  var html = '<div class="day-detail">' +
    '<div style="display:flex;align-items:center;gap:10px;">' +
    '<img src="' + mascotForCls(t.cls) + '" alt="" style="width:56px;height:56px;flex-shrink:0;">' +
    '<div class="day-detail-title" style="margin:0;">' + parts[1] + '월 ' + d + '일 · ' + t.label + '</div>' +
    '</div>' +
    '<div class="day-detail-sun" id="sunmoon-line">🌅 일출 ' + t.sunrise + '　🌇 일몰 ' + t.sunset + ' <span style="opacity:0.6;">(추정치)</span></div>' +
    '<p id="tide-line" class="weather-badge hidden"></p>' +
    '<p id="weather-line" class="weather-badge">날씨 확인 중…</p>' +
    '<div class="section-label">채집 기록</div>';

  if (logs.length === 0) html += '<p class="no-log">기록이 없습니다.</p>';
  else html += logs.map(function (l, idx) {
    var amountText = (l.qty != null && l.qty !== '') ? (l.qty + (l.unit || '')) : (l.amount || '');
    return '<div class="log-entry" style="display:flex;justify-content:space-between;align-items:center;">' +
      '<span>' + l.species + ' · ' + amountText + (l.memo ? ' · ' + l.memo : '') + '</span>' +
      '<button data-del-log="' + idx + '" aria-label="기록 삭제" style="background:none;border:none;color:var(--ink-soft);font-size:16px;padding:2px 8px;">✕</button></div>';
  }).join('');

  html += '<div class="form-row">' +
    '<select class="field" id="log-species" style="flex:1.3;">' + allSpecies.map(function (s) { return '<option value="' + s + '">' + s + '</option>'; }).join('') + '</select>' +
    '<input class="field" id="log-qty" type="number" inputmode="numeric" min="0" placeholder="수량" style="flex:0.7;">' +
    '<select class="field" id="log-unit" style="flex:0.7;"><option value="마리">마리</option><option value="kg">kg</option><option value="개">개</option></select>' +
    '</div>' +
    '<input class="field" id="log-memo" type="text" placeholder="메모 (선택)">' +
    '<p class="error-text hidden" id="log-error">수량을 입력하세요.</p>' +
    '<button class="btn" id="log-save">＋ 기록 추가</button></div>';

  el.innerHTML = html;

  Array.prototype.forEach.call(el.querySelectorAll('[data-del-log]'), function (b) {
    b.addEventListener('click', function () {
      if (!window.confirm('이 기록을 삭제할까요?')) return;
      var idx = parseInt(b.getAttribute('data-del-log'), 10);
      catchLog[key].splice(idx, 1);
      if (catchLog[key].length === 0) delete catchLog[key];
      saveState('haerujil.catchLog', catchLog);
      renderCalendarTab(document.getElementById('content-area'));
    });
  });

  fetchSunMoon(tabRegion.calendar, selectedDate).then(function (data) {
    var line = document.getElementById('sunmoon-line');
    if (!line || !data) return;
    var sm = parseSunMoon(data);
    if (!sm) return;
    var moonText = sm.moonrise ? ('　🌙 월출 ' + sm.moonrise + (sm.moonset ? ' 월몰 ' + sm.moonset : '')) : '';
    line.innerHTML = '🌅 일출 ' + sm.sunrise + '　🌇 일몰 ' + sm.sunset + moonText;
  });

  fetchRealTide(tabRegion.calendar, selectedDate).then(function (data) {
    var line = document.getElementById('tide-line');
    if (!line) return;
    line.classList.remove('hidden');
    if (!data) {
      line.textContent = '🌊 실제 물때 데이터를 가져오지 못했어요 (네트워크 또는 서버 문제일 수 있어요).';
      return;
    }
    var extremes = extractTideExtremes(data);
    if (!extremes) {
      line.textContent = '🌊 응답은 받았지만 만조·간조 시각을 찾지 못했어요.';
      return;
    }
    var text = extremes.map(function (e) {
      return (e.type === 'high' ? '만조 ' : '간조 ') + formatHm(e.time);
    }).join(' · ');
    line.textContent = '🌊 ' + text;
  });

  fetchWeather(tabRegion.calendar, selectedDate).then(function (w) {
    var line = document.getElementById('weather-line');
    if (!line) return;
    if (!w) {
      line.textContent = '날씨 정보는 오늘부터 2~3일 뒤까지만 나와요 (더 먼 날짜는 표시되지 않아요).';
      return;
    }
    var windWarn = (w.wsd != null && w.wsd >= 8) ? ' · ⚠ 바람 강함(초속 ' + w.wsd + 'm)' : (w.wsd != null ? ' · 바람 초속 ' + w.wsd + 'm' : '');
    var popText = (w.pop != null) ? ' · 강수확률 ' + w.pop + '%' : '';
    line.textContent = weatherIcon(w) + ' ' + '날씨' + popText + windWarn;
  });

  document.getElementById('log-save').addEventListener('click', function () {
    var sp = document.getElementById('log-species').value;
    var qty = document.getElementById('log-qty').value.trim();
    var unit = document.getElementById('log-unit').value;
    var memo = document.getElementById('log-memo').value.trim();
    var err = document.getElementById('log-error');
    if (!qty) { err.classList.remove('hidden'); return; }
    err.classList.add('hidden');
    if (!catchLog[key]) catchLog[key] = [];
    catchLog[key].push({ species: sp, qty: qty, unit: unit, memo: memo });
    saveState('haerujil.catchLog', catchLog);
    renderCalendarTab(document.getElementById('content-area'));
  });
}

/* ============================================================
   저장한 영상 탭
============================================================ */
function youtubeVideoId(url) {
  if (!url) return null;
  var m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([a-zA-Z0-9_-]{6,})/);
  return m ? m[1] : null;
}

function renderVideosTab(el) {
  var list = savedVideos;

  var html = list.length === 0
    ? '<p class="no-log">저장된 영상이 없습니다.</p>'
    : list.map(function (v, idx) {
        var vid = youtubeVideoId(v.url);
        var thumb = vid
          ? '<img src="https://img.youtube.com/vi/' + vid + '/mqdefault.jpg" alt="" style="width:52px;height:52px;object-fit:cover;border-radius:10px;flex-shrink:0;">'
          : '<div class="video-thumb">▶</div>';
        var href = v.url ? v.url : '#';
        return '<div class="video-card" style="display:flex;align-items:center;gap:8px;">' +
          '<a href="' + href + '" target="_blank" rel="noopener" style="display:flex;gap:12px;align-items:center;flex:1;min-width:0;text-decoration:none;color:inherit;">' + thumb + '<div class="video-info">' +
          '<p class="video-title">' + v.title + '</p>' +
          '<p class="video-meta">' + v.region + ' · ' + v.species + '</p></div></a>' +
          '<button data-del-video="' + idx + '" aria-label="영상 삭제" style="background:none;border:none;color:var(--ink-soft);font-size:18px;padding:6px;flex-shrink:0;">✕</button></div>';
      }).join('');

  html += '<div class="section-label">영상 추가</div>' +
    '<input class="field" id="vid-url" type="text" placeholder="유튜브 링크 붙여넣기">' +
    '<input class="field" id="vid-title" type="text" placeholder="제목">' +
    '<select class="field" id="vid-region">' + Object.keys(regions).map(function (k) {
      return '<option value="' + regions[k].label + '">' + regions[k].label + '</option>';
    }).join('') + '</select>' +
    '<p class="error-text hidden" id="vid-error">링크와 제목을 입력하세요.</p>' +
    '<button class="btn" id="vid-save">＋ 영상 저장</button>';

  el.innerHTML = html;
  Array.prototype.forEach.call(el.querySelectorAll('[data-del-video]'), function (b) {
    b.addEventListener('click', function () {
      if (!window.confirm('이 영상을 삭제할까요?')) return;
      var idx = parseInt(b.getAttribute('data-del-video'), 10);
      savedVideos.splice(idx, 1);
      saveState('haerujil.videos', savedVideos);
      renderVideosTab(el);
    });
  });
  document.getElementById('vid-save').addEventListener('click', function () {
    var url = document.getElementById('vid-url').value.trim();
    var title = document.getElementById('vid-title').value.trim();
    var region = document.getElementById('vid-region').value;
    var err = document.getElementById('vid-error');
    if (!url || !title) { err.classList.remove('hidden'); return; }
    err.classList.add('hidden');
    savedVideos.push({ title: title, region: region, species: '-', url: url });
    saveState('haerujil.videos', savedVideos);
    renderVideosTab(el);
  });
}

/* ============================================================
   하단 탭 바 — 항상 떠 있음
============================================================ */
function renderTabbar() {
  var tabs = [
    { id: 'map', label: '해루질 지도', icon: '📍' },
    { id: 'camp', label: '캠핑지도', icon: '⛺' },
    { id: 'calendar', label: '캘린더', icon: '📅' },
    { id: 'videos', label: '저장한 영상', icon: '▶' },
    { id: 'more', label: '더보기', icon: '⋯' }
  ];
  var el = document.getElementById('tabbar');
  el.innerHTML = tabs.map(function (t) {
    return '<button class="tab-btn' + (t.id === currentTab ? ' active' : '') + '" data-tab="' + t.id + '">' +
      '<span class="tab-icon">' + t.icon + '</span><span>' + t.label + '</span></button>';
  }).join('');
  Array.prototype.forEach.call(el.querySelectorAll('button'), function (b) {
    b.addEventListener('click', function () {
      currentTab = b.getAttribute('data-tab');
      selectedDate = null;
      renderAll();
    });
  });
}

/* ============================================================
   초기 렌더
============================================================ */
function initApp() {
  var app = document.getElementById('app');
  app.innerHTML =
    '<div class="app-header"><div class="app-title">해루질</div></div>' +
    '<div id="region-bar"></div>' +
    '<div class="screen-area" id="content-area"></div>' +
    '<div class="tabbar" id="tabbar"></div>';
  renderAll();
}

document.addEventListener('DOMContentLoaded', initApp);
