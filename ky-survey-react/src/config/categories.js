export const CATEGORIES = {
  'RtoS GUI':      { color: '#4361ee', bg: '#e8eaff' },
  'RtoS SPC':      { color: '#2ec4b6', bg: '#d1fae5' },
  'KSMART':        { color: '#fb5607', bg: '#fff0e0' },
  'KPO':           { color: '#8338ec', bg: '#f0e6ff' },
  'Smart Review':  { color: '#118ab2', bg: '#dff0fa' },
  'KAP':           { color: '#e63946', bg: '#fee2e2' },
  '기타':          { color: '#6b7280', bg: '#f0f2f5' }
};

export function getCatStyle(cat) {
  return CATEGORIES[cat] || CATEGORIES['기타'];
}

export function getCatBadge(cat) {
  const style = getCatStyle(cat);
  return { color: style.color, backgroundColor: style.bg };
}
