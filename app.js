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
var TIDE_API_ENDPOINT = 'https://www.khoa.go.kr/api/oceangrid/tideObsPre/search.do';
var OBS_CODES = {
  wangsan: 'YOUR_OBS_CODE_YEONGJONGWANGSAN',
  yeongheung: 'YOUR_OBS_CODE_YEONGHEUNGDO',
  taean: 'YOUR_OBS_CODE_ANHEUNG'
};

/* ============================================================
   데이터 — 좌표는 대략적인 값입니다.
============================================================ */
var regions = {
  wangsan: {
    label: '왕산(영종도)', center: { lat: 37.4470, lng: 126.3700 }, level: 6,
    points: [
      { name: '왕산해수욕장', lat: 37.4478, lng: 126.3762, species: ['바지락', '동죽', '낙지'] },
      { name: '선녀바위', lat: 37.4448, lng: 126.3695, species: ['백합', '주꾸미', '소라'] },
      { name: '을왕리', lat: 37.4438, lng: 126.3701, species: ['소라', '박하지'] },
      { name: '마시안', lat: 37.4529, lng: 126.3639, species: ['바지락', '동죽'] }
    ],
    campsFormal: [
      { name: '왕산가족오토캠핑장', note: '왕산해수욕장 도보 1분, 카라반 구역 있음' },
      { name: '을왕리 솔트캠핑장', note: '차박 전용 구역·카라반 구역 분리, 주차 넉넉' }
    ],
    campsInformal: [
      { name: '을왕리 해변 노지 주차', note: '무료지만 만조 시 주차구역 침수 위험 — 물때 확인 후 높은 곳에 주차', caution: true }
    ]
  },
  yeongheung: {
    label: '영흥도', center: { lat: 37.2350, lng: 126.4350 }, level: 7,
    points: [
      { name: '십리포해수욕장', lat: 37.2426, lng: 126.4278, species: ['낙지', '소라', '박하지', '갯가재'] },
      { name: '장경리해수욕장', lat: 37.2334, lng: 126.4308, species: ['바지락', '굴'] },
      { name: '노가리해변', lat: 37.2278, lng: 126.4457, species: ['키조개', '소라', '골뱅이', '꽃게'] }
    ],
    campsFormal: [
      { name: '십리포해수욕장 캠핑장', note: '정식 야영장, 유료' },
      { name: '캠프노마드', note: '카라반·오토캠핑, 수영장 있음' }
    ],
    campsInformal: [
      { name: '장경리해수욕장 노지', note: '예전엔 무료 노지캠핑 명소였으나 최근 단속 강화로 야영 금지구역 있음 — 방문 전 확인 필요', caution: true }
    ]
  },
  taean: {
    label: '태안', center: { lat: 36.6500, lng: 126.2800 }, level: 8,
    points: [
      { name: '몽산포', lat: 36.6820, lng: 126.2957, species: ['바지락', '낙지', '개조개', '소라'] },
      { name: '청포대', lat: 36.6650, lng: 126.2900, species: ['백합', '대맛', '맛조개'] },
      { name: '방포해변', lat: 36.6100, lng: 126.2600, species: ['바지락', '소라', '맛조개'] },
      { name: '신두리', lat: 36.8300, lng: 126.1500, species: ['골뱅이', '동죽', '대맛'] }
    ],
    campsFormal: [
      { name: '몽산포 오토캠핑장', note: '전기·샤워장 완비, 1박 약 5만원' },
      { name: '마검포 아름뜰 캠핑장', note: '조용한 편, 해루질 포인트 인접' }
    ],
    campsInformal: [
      { name: '마검포항 노지', note: '무료 노지 차박, 방파제 안쪽 잔잔한 해변에서 낚시·해루질 병행 가능', caution: false },
      { name: '솔향기길 해안 차박지', note: '전기·수도 없음, 조용한 감성 차박지', caution: false }
    ]
  }
};

var inactiveMarkers = [
  { label: '강화도', lat: 37.7472, lng: 126.4875 },
  { label: '보령·서천', lat: 36.3504, lng: 126.5222 }
];

var regulatedSpecies = ['낙지', '꽃게', '소라', '백합', '키조개', '주꾸미'];

var regInfo = {
  '낙지': '금어기 6.1~6.30 (인천·경기 지역은 6.21~7.20으로 별도 적용)',
  '꽃게': '금어기 6.21~8.20, 두흉갑장 6.4cm 이하 포획 금지',
  '소라': '금어기 6.1~8.31, 각고 5cm 이하 금지 (서해 소라는 종 확인이 필요할 수 있음)',
  '백합': '금어기 7.1~8.20, 각장 5cm 이하 금지',
  '키조개': '금어기 7.1~8.31, 각장 약 18cm 이하 금지',
  '주꾸미': '금어기 5.11~8.31'
};

var defaultVideos = [
  { title: '영흥도 십리포 소라 해루질', region: '영흥도', species: '소라', url: '' },
  { title: '태안 몽산포 낙지잡이', region: '태안', species: '낙지', url: '' }
];

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
if (!savedVideos) { savedVideos = defaultVideos.slice(); saveState('haerujil.videos', savedVideos); }

/* ============================================================
   앱 상태
============================================================ */
var currentRegion = null;
var currentTab = 'map';
var today = new Date();
var calYear = today.getFullYear();
var calMonth = today.getMonth();
var selectedDate = null;
var selectMap = null;
var regionMap = null;
var kakaoOk = (typeof kakao !== 'undefined');

/* ============================================================
   카카오맵 헬퍼
============================================================ */
function withKakao(callback) {
  if (!kakaoOk) return;
  kakao.maps.load(callback);
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

function fetchRealTide(regionKey, dateStr) {
  if (!TIDE_API_ENDPOINT || TIDE_API_ENDPOINT.indexOf('YOUR_') === 0 || TIDE_API_KEY.indexOf('YOUR_') === 0) {
    return Promise.resolve(null);
  }
  var obsCode = OBS_CODES[regionKey];
  if (!obsCode || obsCode.indexOf('YOUR_') === 0) return Promise.resolve(null);
  var url = TIDE_API_ENDPOINT + '?ServiceKey=' + encodeURIComponent(TIDE_API_KEY) +
    '&ObsCode=' + obsCode + '&Date=' + dateStr.replace(/-/g, '') + '&ResultType=json';
  return fetch(url).then(function (res) { return res.ok ? res.json() : null; })
    .then(function (data) { if (data) console.log('물때 API 응답(콘솔 확인용)', data); return data; })
    .catch(function () { return null; });
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

function renderToolbar() {
  var el = document.getElementById('toolbar');
  el.innerHTML =
    '<button class="pill-btn" id="export-btn">내보내기</button>' +
    '<label class="pill-btn" id="import-label" style="cursor:pointer;">불러오기' +
    '<input type="file" id="import-input" accept="application/json" style="display:none;"></label>';
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
  if (!currentRegion) {
    el.innerHTML = '';
    return;
  }
  var r = regions[currentRegion];
  el.innerHTML = '<div class="region-topbar">' +
    '<span class="region-name">' + r.label + '</span>' +
    '<button class="pill-btn" id="change-region">지역 변경</button></div>';
  document.getElementById('change-region').addEventListener('click', function () {
    currentRegion = null;
    currentTab = 'map';
    selectedDate = null;
    renderAll();
  });
}

/* ============================================================
   콘텐츠 영역
============================================================ */
function renderContent() {
  var el = document.getElementById('content-area');
  if (currentTab === 'map') {
    if (!currentRegion) renderNationalMap(el);
    else renderRegionMap(el);
    return;
  }
  if (currentTab === 'camp') {
    if (!currentRegion) { renderRegionPrompt(el); return; }
    renderCampTab(el);
    return;
  }
  if (currentTab === 'calendar') { renderCalendarTab(el); return; }
  if (currentTab === 'videos') { renderVideosTab(el); return; }
}

function renderRegionPrompt(el) {
  el.innerHTML = '<p class="no-log" style="margin-bottom:14px;">이 탭을 보려면 먼저 지역을 선택해주세요.</p>' +
    Object.keys(regions).map(function (key) {
      return '<button class="region-pick-btn" data-pick="' + key + '">📍 ' + regions[key].label + '</button>';
    }).join('');
  Array.prototype.forEach.call(el.querySelectorAll('[data-pick]'), function (b) {
    b.addEventListener('click', function () {
      currentRegion = b.getAttribute('data-pick');
      renderAll();
    });
  });
}

/* ============================================================
   해루질 지도 탭
============================================================ */
function speciesBadge(sp) {
  var reg = regulatedSpecies.indexOf(sp) >= 0;
  if (reg) return '<button class="badge reg" data-reg-info="' + sp + '">' + sp + ' ⓘ</button>';
  return '<span class="badge">' + sp + '</span>';
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
    '<div class="map-box" id="select-map"></div>' +
    '<p class="map-hint">점을 탭하면 그 지역으로 들어갑니다. 회색 점은 아직 정보가 없는 지역이에요.</p>';

  var mapEl = document.getElementById('select-map');
  if (!kakaoOk) { mapFallback(mapEl, '지도를 불러오지 못했어요. index.html의 카카오 JavaScript 키를 확인해주세요.'); return; }

  withKakao(function () {
    var center = new kakao.maps.LatLng(37.0, 126.35);
    selectMap = new kakao.maps.Map(mapEl, { center: center, level: 11 });
    Object.keys(regions).forEach(function (key) {
      var r = regions[key];
      addLabeledMarker(selectMap, r.center.lat, r.center.lng, r.label, false, function () {
        currentRegion = key;
        renderAll();
      });
    });
    inactiveMarkers.forEach(function (m) {
      addLabeledMarker(selectMap, m.lat, m.lng, m.label, true, null);
    });
  });
}

function renderRegionMap(el) {
  var r = regions[currentRegion];
  el.innerHTML =
    '<div class="point-map" id="region-map"></div>' +
    r.points.map(function (p) {
      return '<div class="point-card"><div class="point-card-title">📍 ' + p.name + '</div><div>' +
        p.species.map(speciesBadge).join('') + '</div></div>';
    }).join('') +
    '<p id="reg-detail" class="camp-card-note" style="min-height:18px;"></p>';

  attachRegInfoHandlers(el);

  var mapEl = document.getElementById('region-map');
  if (!kakaoOk) { mapFallback(mapEl, '지도를 불러오지 못했어요. index.html의 카카오 JavaScript 키를 확인해주세요.'); return; }

  withKakao(function () {
    var center = new kakao.maps.LatLng(r.center.lat, r.center.lng);
    regionMap = new kakao.maps.Map(mapEl, { center: center, level: r.level });
    r.points.forEach(function (p) {
      addLabeledMarker(regionMap, p.lat, p.lng, p.name, false, null);
    });
  });
}

/* ============================================================
   캠핑지도 탭
============================================================ */
function renderCampTab(el) {
  var r = regions[currentRegion];
  var html = '<div class="section-label">정식 캠핑장</div>';
  html += r.campsFormal.map(function (c) {
    return '<div class="camp-card"><div class="camp-card-title">⛺ ' + c.name + '</div>' +
      '<div class="camp-card-note">' + c.note + '</div></div>';
  }).join('');
  html += '<div class="section-label">차박·노지 스팟</div>';
  html += r.campsInformal.map(function (c) {
    var warn = c.caution ? '<span class="badge reg" style="cursor:default;">주의</span>' : '';
    return '<div class="camp-card"><div class="camp-card-title">🚐 ' + c.name + warn + '</div>' +
      '<div class="camp-card-note">' + c.note + '</div></div>';
  }).join('');
  el.innerHTML = html;
}

/* ============================================================
   캘린더 탭
============================================================ */
function dateKey(d) { return calYear + '-' + (calMonth + 1) + '-' + d; }
function logKey(dStr) { return currentRegion + '|' + dStr; }

function monthlySummaryHtml() {
  var totals = {};
  Object.keys(catchLog).forEach(function (key) {
    if (key.indexOf(currentRegion + '|') !== 0) return;
    var dStr = key.slice(currentRegion.length + 1);
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
  if (!currentRegion) currentRegion = Object.keys(regions)[0];
  var chipsHtml = Object.keys(regions).map(function (key) {
    var active = key === currentRegion;
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

  html += '<div class="cal-grid">';
  ['일', '월', '화', '수', '목', '금', '토'].forEach(function (d) { html += '<div class="cal-dow">' + d + '</div>'; });
  for (var i = 0; i < startIdx; i++) html += '<div></div>';
  for (var d = 1; d <= daysInMonth; d++) {
    var t = tideInfo(d);
    var dStr = dateKey(d);
    var hasLog = catchLog[logKey(dStr)] && catchLog[logKey(dStr)].length > 0;
    var sel = selectedDate === dStr;
    html += '<button class="cal-day' + (sel ? ' selected' : '') + '" data-date="' + dStr + '" ' +
      'style="background:' + (t.cls === 'sari' ? '#FAECE7' : t.cls === 'jogeum' ? '#E6F1FB' : '#F1EFE8') + '">' +
      '<span class="d-num">' + d + '</span><span class="d-tide">' + t.label + '</span>' +
      (hasLog ? '<span class="d-dot"></span>' : '') + '</button>';
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
      currentRegion = b.getAttribute('data-region-chip');
      selectedDate = null;
      renderRegionBar();
      renderCalendarTab(el);
    });
  });
  Array.prototype.forEach.call(el.querySelectorAll('[data-date]'), function (b) {
    b.addEventListener('click', function () { selectedDate = b.getAttribute('data-date'); renderCalendarTab(el); });
  });
  if (selectedDate) renderDayDetail();
}

function renderDayDetail() {
  var el = document.getElementById('day-detail');
  if (!el || !selectedDate) return;
  var parts = selectedDate.split('-');
  var d = parseInt(parts[2], 10);
  var t = tideInfo(d);
  var r = regions[currentRegion];
  var allSpecies = [];
  r.points.forEach(function (p) { p.species.forEach(function (s) { if (allSpecies.indexOf(s) < 0) allSpecies.push(s); }); });

  var key = logKey(selectedDate);
  var logs = catchLog[key] || [];

  var html = '<div class="day-detail">' +
    '<div class="day-detail-title">' + parts[1] + '월 ' + d + '일 · ' + t.label + '</div>' +
    '<div class="day-detail-sun">🌅 일출 ' + t.sunrise + '　🌇 일몰 ' + t.sunset + '</div>' +
    '<div class="section-label">채집 기록</div>';

  if (logs.length === 0) html += '<p class="no-log">기록이 없습니다.</p>';
  else html += logs.map(function (l) {
    var amountText = (l.qty != null && l.qty !== '') ? (l.qty + (l.unit || '')) : (l.amount || '');
    return '<div class="log-entry">' + l.species + ' · ' + amountText + (l.memo ? ' · ' + l.memo : '') + '</div>';
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
    : list.map(function (v) {
        var vid = youtubeVideoId(v.url);
        var thumb = vid
          ? '<img src="https://img.youtube.com/vi/' + vid + '/mqdefault.jpg" alt="" style="width:52px;height:52px;object-fit:cover;border-radius:10px;flex-shrink:0;">'
          : '<div class="video-thumb">▶</div>';
        var href = v.url ? v.url : '#';
        return '<a class="video-card" href="' + href + '" target="_blank" rel="noopener">' + thumb + '<div class="video-info">' +
          '<p class="video-title">' + v.title + '</p>' +
          '<p class="video-meta">' + v.region + ' · ' + v.species + '</p></div></a>';
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
    { id: 'videos', label: '저장한 영상', icon: '▶' }
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
    '<div class="app-title">해루질</div>' +
    '<div id="toolbar" style="display:flex;gap:8px;margin-bottom:12px;"></div>' +
    '<div id="region-bar"></div>' +
    '<div class="screen-area" id="content-area"></div>' +
    '<div class="tabbar" id="tabbar"></div>';
  renderToolbar();
  renderAll();
}

document.addEventListener('DOMContentLoaded', initApp);
