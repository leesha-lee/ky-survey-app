import { loadData, saveData } from './db';
import { uid } from './utils';

export async function seedSampleData() {
  const data = await loadData();
  if (data.surveys.length > 0) return;

  // 공통 응답자 풀 (고영 실제 부서명 사용, UX/UI팀이 타 부서에 설문하는 시나리오)
  const sampleNames = ['김민수','이서연','박지훈','최수진','정우성','강지현','윤태호','한소영','오준혁','임수빈','배성민','조은정','신동욱','권미래','홍재원','장서윤','문현우','양지은','류태양','송예진','안정훈','황보라','전민서','고은서','한승우','나지원','서민재','유하늘','차은비','맹준영'];
  function mkResp(name, dept) { const eid = name.replace(/[^a-zA-Z가-힣]/g, '').toLowerCase(); return { name, email: eid + '@kohyoung.com', department: dept }; }

  // ── S1: SPI 검사기 UI 사용성 평가 (진행중) ──
  const sid1 = 'sample_' + uid();
  const g1a = 'grp_' + uid(), g1b = 'grp_' + uid(), g1c = 'grp_' + uid();
  const s1 = { id: sid1, title: 'SPI 검사기 UI 사용성 평가', category: '제품평가', description: 'SPI 검사기 소프트웨어의 UI 사용성을 평가하여 차기 버전 개선 방향을 도출하기 위한 설문입니다. 실제 검사기를 사용하시는 분들의 솔직한 의견을 부탁드립니다.', createdAt: '2026. 3. 10.', closed: false,
    questionGroups: [{ id: g1a, name: 'UI 직관성', color: '#4361ee' }, { id: g1b, name: '작업 효율', color: '#2ec4b6' }, { id: g1c, name: '종합 의견', color: '#8338ec' }],
    questions: [
      { id: uid(), type: 'radio', title: 'SPI 검사기를 얼마나 자주 사용하십니까?', required: true, options: ['매일 사용', '주 2~3회', '주 1회', '월 1~2회', '거의 사용하지 않음'], media: [], group: '' },
      { id: uid(), type: 'scale', title: '검사기 메인 화면의 레이아웃이 직관적입니까?', required: true, scaleMin: 1, scaleMax: 5, labelMin: '매우 복잡함', labelMax: '매우 직관적', media: [], group: g1a },
      { id: uid(), type: 'scale', title: '메뉴 및 기능 탐색이 쉽습니까?', required: true, scaleMin: 1, scaleMax: 5, labelMin: '매우 어려움', labelMax: '매우 쉬움', media: [], group: g1a },
      { id: uid(), type: 'scale', title: '레시피 설정 작업의 효율성은 어떠합니까?', required: true, scaleMin: 1, scaleMax: 5, labelMin: '매우 비효율적', labelMax: '매우 효율적', media: [], group: g1b },
      { id: uid(), type: 'scale', title: '검사 결과 확인 및 분석 화면이 이해하기 쉽습니까?', required: true, scaleMin: 1, scaleMax: 5, labelMin: '매우 어려움', labelMax: '매우 쉬움', media: [], group: g1b },
      { id: uid(), type: 'checkbox', title: '가장 개선이 필요한 UI 영역을 모두 선택해 주세요.', required: true, options: ['메인 대시보드', '레시피 편집 화면', '검사 결과 뷰어', '리포트/통계 화면', '알람 설정', '사용자 설정'], media: [], group: g1c },
      { id: uid(), type: 'text', title: 'UI 개선에 대한 구체적인 의견이 있으시면 자유롭게 작성해 주세요.', required: false, options: [], media: [], group: g1c }
    ] };
  const s1Depts = ['국내TS팀', '국내TS팀', '국내TS팀', '국내TS팀', '국내TS팀', '해외TS팀', '해외TS팀', '해외TS팀', '검사기SW기획팀', '검사기SW기획팀', '검사기SW기획팀', '제어1팀', '제어1팀', '제어1팀', '품질혁신팀', '품질혁신팀', '기계설계팀', '기계설계팀', '광학설계팀', '광학설계팀'];
  const s1Freq = s1.questions[0].options, s1Areas = s1.questions[5].options;
  const s1Texts = ['레시피 편집 시 단축키가 있으면 좋겠습니다.', '결과 화면 글자가 작아서 읽기 힘듭니다.', '전체적으로 괜찮지만 리포트 커스터마이징이 부족해요.', '', '다크모드 지원 부탁드립니다.', '메뉴 구조가 너무 깊어서 자주 쓰는 기능 찾기 어렵습니다.', '', '알람이 너무 많이 떠서 중요한 알람을 놓칠 때가 있습니다.', '검사 결과 비교 기능이 직관적이지 않습니다.', '', '대시보드에 자주 보는 항목을 커스터마이징하고 싶습니다.', '', '레시피 복사/붙여넣기가 불편합니다.', '로딩 속도가 느릴 때가 있어요.', '통계 차트 종류가 다양했으면 좋겠습니다.', '', '전반적으로 만족합니다.', '', '아이콘이 직관적이지 않은 것들이 있습니다.', ''];
  const r1 = [];
  for (let i = 0; i < 20; i++) {
    const d = new Date(2026, 2, 10 + Math.floor(i / 4)); d.setHours(9 + (i % 8), (i * 17) % 60);
    r1.push({ answers: { 0: s1Freq[i < 8 ? 0 : i < 13 ? 1 : i < 17 ? 2 : 3], 1: String([3, 4, 3, 2, 4, 3, 2, 4, 5, 4, 3, 3, 4, 2, 3, 4, 3, 4, 3, 4][i]), 2: String([3, 3, 4, 2, 3, 4, 2, 3, 5, 4, 4, 3, 3, 2, 3, 4, 3, 3, 4, 3][i]), 3: String([2, 3, 3, 2, 4, 3, 2, 3, 4, 4, 3, 3, 3, 2, 3, 4, 3, 4, 3, 3][i]), 4: String([4, 3, 4, 3, 4, 3, 3, 4, 5, 4, 3, 4, 4, 2, 3, 4, 4, 3, 4, 3][i]), 5: [...s1Areas].sort(() => Math.random() - .5).slice(0, (i % 3) + 1), 6: s1Texts[i] || '' }, submittedAt: d.toISOString(), respondent: mkResp(sampleNames[i], s1Depts[i]) });
  }

  // ── S2: SPI 검사기 UI 사용성 평가 (2025 Q4, 종료) ──
  const sid2 = 'sample2_' + uid();
  const g2a = 'grp_' + uid(), g2b = 'grp_' + uid(), g2c = 'grp_' + uid();
  const s2 = JSON.parse(JSON.stringify(s1)); s2.id = sid2; s2.title = '2025년 4분기 SPI 검사기 UI 사용성 평가'; s2.description = '2025년 4분기에 진행한 SPI 검사기 UI 사용성 평가 결과입니다.'; s2.createdAt = '2025. 12. 10.'; s2.closed = true;
  s2.questionGroups = [{ id: g2a, name: 'UI 직관성', color: '#4361ee' }, { id: g2b, name: '작업 효율', color: '#2ec4b6' }, { id: g2c, name: '종합 의견', color: '#8338ec' }];
  s2.questions.forEach(q => { q.id = uid(); const m = { [g1a]: g2a, [g1b]: g2b, [g1c]: g2c }; q.group = m[q.group] || ''; });
  const s2Depts = ['국내TS팀', '국내TS팀', '국내TS팀', '국내TS팀', '해외TS팀', '해외TS팀', '해외TS팀', '검사기SW기획팀', '검사기SW기획팀', '제어1팀', '제어1팀', '품질혁신팀', '품질혁신팀', '기계설계팀', '광학설계팀'];
  const r2 = [];
  for (let i = 0; i < 15; i++) {
    const d = new Date(2025, 11, 10 + Math.floor(i / 3)); d.setHours(10 + (i % 7), (i * 13) % 60);
    r2.push({ answers: { 0: s1Freq[i < 5 ? 0 : i < 9 ? 1 : i < 12 ? 2 : 3], 1: String([2, 3, 3, 2, 3, 2, 2, 3, 4, 3, 2, 3, 2, 3, 3][i]), 2: String([2, 2, 3, 2, 3, 3, 2, 2, 4, 3, 2, 2, 3, 3, 2][i]), 3: String([2, 2, 3, 2, 3, 2, 2, 3, 3, 3, 2, 2, 2, 3, 2][i]), 4: String([3, 3, 3, 2, 3, 3, 2, 3, 4, 3, 3, 3, 2, 3, 3][i]), 5: [...s1Areas].sort(() => Math.random() - .5).slice(0, (i % 3) + 1), 6: ['화면이 복잡합니다.', '', '레시피 편집이 불편해요.', '', '메뉴가 직관적이지 않습니다.', '속도 개선 희망.', '', '결과 화면 개선 필요.', '전반적으로 보통입니다.', '', '알람 관리 어렵습니다.', '', '리포트 기능 부족.', '', '아이콘이 헷갈립니다.'][i] || '' }, submittedAt: d.toISOString(), respondent: mkResp(sampleNames[i], s2Depts[i]) });
  }

  // ── S3: 사내 업무 툴 UX 만족도 조사 ──
  const sid3 = 'sample3_' + uid();
  const g3a = 'grp_' + uid(), g3b = 'grp_' + uid();
  const s3 = { id: sid3, title: '사내 업무 툴 UX 만족도 조사', category: '업무프로세스', description: '현재 사용 중인 사내 업무 툴(KPO, JIRA, Confluence 등)의 UX 만족도를 조사하여 개선 우선순위를 도출합니다.', createdAt: '2026. 2. 20.', closed: true,
    questionGroups: [{ id: g3a, name: '툴별 만족도', color: '#118ab2' }, { id: g3b, name: '개선 방향', color: '#06d6a0' }],
    questions: [
      { id: uid(), type: 'scale', title: 'KPO(사내 포털)의 사용 편의성에 만족하십니까?', required: true, scaleMin: 1, scaleMax: 5, labelMin: '매우 불만족', labelMax: '매우 만족', media: [], group: g3a },
      { id: uid(), type: 'scale', title: 'JIRA의 사용 편의성에 만족하십니까?', required: true, scaleMin: 1, scaleMax: 5, labelMin: '매우 불만족', labelMax: '매우 만족', media: [], group: g3a },
      { id: uid(), type: 'scale', title: 'Confluence의 사용 편의성에 만족하십니까?', required: true, scaleMin: 1, scaleMax: 5, labelMin: '매우 불만족', labelMax: '매우 만족', media: [], group: g3a },
      { id: uid(), type: 'radio', title: '가장 UX 개선이 시급한 툴은 무엇입니까?', required: true, options: ['KPO (사내 포털)', 'JIRA', 'Confluence', '메신저 (Teams)', '기타'], media: [], group: g3b },
      { id: uid(), type: 'checkbox', title: '사내 툴 사용 시 불편한 점을 모두 선택해 주세요.', required: true, options: ['검색 기능 부족', '모바일 지원 미흡', '느린 로딩 속도', '복잡한 UI', '부족한 알림/연동', '매뉴얼/가이드 부족'], media: [], group: g3b },
      { id: uid(), type: 'text', title: '사내 툴 UX 관련 추가 의견을 남겨 주세요.', required: false, options: [], media: [], group: g3b }
    ] };
  const s3Depts = ['MS 개발 1팀', 'MS 개발 1팀', 'MS 개발 2팀', 'MS 개발 2팀', '검사기SW기획팀', '검사기SW기획팀', '제어1팀', '제어1팀', '품질혁신팀', '국내영업팀', '국내영업팀', '해외영업팀', '인사팀', '경영기획팀', '기계설계팀', '광학설계팀', '국내TS팀', '해외TS팀'];
  const s3Tools = s3.questions[3].options, s3Issues = s3.questions[4].options;
  const s3Texts = ['KPO 검색이 너무 느립니다.', 'JIRA 대시보드 커스터마이징이 부족해요.', '', 'Confluence 편집기가 불안정합니다.', '모바일에서 KPO 접속이 안 돼요.', '', 'Teams 연동이 더 되면 좋겠습니다.', '전반적으로 툴이 너무 많습니다.', '', 'KPO에 원하는 정보 찾기 어렵습니다.', 'JIRA 알림이 너무 많습니다.', '', '사내 툴 통합이 필요합니다.', '', '가이드 문서가 더 있으면 좋겠어요.', '', '로딩이 너무 오래 걸려요.', ''];
  const r3 = [];
  for (let i = 0; i < 18; i++) {
    const d = new Date(2026, 1, 20 + Math.floor(i / 4)); d.setHours(10 + (i % 7), (i * 11) % 60);
    r3.push({ answers: { 0: String([2, 3, 2, 3, 4, 3, 2, 3, 3, 2, 3, 2, 3, 4, 2, 3, 2, 3][i]), 1: String([3, 4, 3, 4, 4, 3, 3, 4, 3, 2, 3, 3, 4, 3, 3, 4, 3, 3][i]), 2: String([3, 3, 2, 4, 3, 3, 3, 3, 2, 3, 2, 3, 3, 4, 3, 3, 2, 3][i]), 3: s3Tools[[0, 1, 2, 0, 2, 0, 0, 3, 0, 0, 1, 0, 3, 1, 0, 2, 0, 0][i]], 4: [...s3Issues].sort(() => Math.random() - .5).slice(0, (i % 3) + 1), 5: s3Texts[i] || '' }, submittedAt: d.toISOString(), respondent: mkResp(sampleNames[i], s3Depts[i]) });
  }

  // ── S4: 신규 디자인 시스템 컴포넌트 피드백 ──
  const sid4 = 'sample4_' + uid();
  const s4 = { id: sid4, title: '신규 디자인 시스템 컴포넌트 피드백', category: '제품평가', description: 'UX/UI팀에서 개발 중인 신규 디자인 시스템 컴포넌트에 대한 개발자 피드백을 수집합니다. 프로토타입을 사용해 보신 후 응답해 주세요.', createdAt: '2026. 3. 15.', closed: false, questionGroups: [],
    questions: [
      { id: uid(), type: 'scale', title: '새 디자인 시스템의 컴포넌트가 구현하기 쉽다고 느끼십니까?', required: true, scaleMin: 1, scaleMax: 5, labelMin: '매우 어려움', labelMax: '매우 쉬움', media: [], group: '' },
      { id: uid(), type: 'scale', title: '기존 디자인 대비 시각적 완성도가 개선되었다고 느끼십니까?', required: true, scaleMin: 1, scaleMax: 5, labelMin: '전혀 아님', labelMax: '매우 개선됨', media: [], group: '' },
      { id: uid(), type: 'radio', title: '가장 유용하다고 생각하는 컴포넌트는 무엇입니까?', required: true, options: ['버튼/아이콘 세트', '데이터 테이블', '차트/그래프', '폼 요소', '네비게이션 바'], media: [], group: '' },
      { id: uid(), type: 'checkbox', title: '개선이 필요한 부분을 모두 선택해 주세요.', required: true, options: ['문서화/가이드', '접근성(Accessibility)', '반응형 지원', '커스터마이징 옵션', '성능 최적화'], media: [], group: '' },
      { id: uid(), type: 'text', title: '디자인 시스템에 대한 추가 피드백이 있다면 작성해 주세요.', required: false, options: [], media: [], group: '' }
    ] };
  const s4Depts = ['MS 개발 1팀', 'MS 개발 1팀', 'MS 개발 2팀', 'MS 개발 2팀', 'MS 개발 2팀', '검사기SW기획팀', '검사기SW기획팀', '제어1팀', 'QA팀', 'QA팀'];
  const s4Comps = s4.questions[2].options, s4Improve = s4.questions[3].options;
  const s4Texts = ['문서가 좀 더 상세했으면 좋겠습니다.', '데이터 테이블 성능이 좋아졌어요.', '', '접근성 관련 가이드라인 추가 부탁드립니다.', '커스터마이징이 편해졌습니다.', '차트 컴포넌트 다양성이 부족합니다.', '', '반응형 대응이 잘 되어 있어요.', '테스트하기 편한 구조입니다.', ''];
  const r4 = [];
  for (let i = 0; i < 10; i++) {
    const d = new Date(2026, 2, 15 + Math.floor(i / 3)); d.setHours(11 + (i % 5), (i * 7) % 60);
    r4.push({ answers: { 0: String([4, 3, 4, 5, 3, 3, 4, 4, 3, 4][i]), 1: String([4, 4, 5, 4, 3, 4, 5, 4, 3, 4][i]), 2: s4Comps[[1, 0, 2, 3, 4, 2, 1, 0, 3, 4][i]], 3: [...s4Improve].sort(() => Math.random() - .5).slice(0, (i % 3) + 1), 4: s4Texts[i] || '' }, submittedAt: d.toISOString(), respondent: mkResp(sampleNames[i + 20], s4Depts[i]) });
  }

  data.surveys.push(s1, s2, s3, s4);
  data.responses[sid1] = r1; data.responses[sid2] = r2; data.responses[sid3] = r3; data.responses[sid4] = r4;
  await saveData(data);
}
