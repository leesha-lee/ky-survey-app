export const CATEGORIES = {
  '직원만족도':  { color: '#4361ee', bg: '#e8eaff' },
  '고객만족도':  { color: '#2ec4b6', bg: '#d1fae5' },
  '제품평가':    { color: '#fb5607', bg: '#fff0e0' },
  '교육/연수':   { color: '#8338ec', bg: '#f0e6ff' },
  '업무프로세스': { color: '#118ab2', bg: '#dff0fa' },
  '조직문화':    { color: '#06d6a0', bg: '#d4f7ed' },
  '이벤트/행사':  { color: '#e63946', bg: '#fee2e2' },
  '기타':        { color: '#6b7280', bg: '#f0f2f5' }
};

export function getCatStyle(cat) {
  return CATEGORIES[cat] || CATEGORIES['기타'];
}

export function getCatBadge(cat) {
  const style = getCatStyle(cat);
  return { color: style.color, backgroundColor: style.bg };
}
