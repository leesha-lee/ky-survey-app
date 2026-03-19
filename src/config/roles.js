export const ADMIN_NAMES = [
  '이승하', '강시내', '김민희', '김이슬', '조은솔', '김예진', '강혜성', '김은희',
];

export function isAdmin(user) {
  if (!user || !user.name) return false;
  return ADMIN_NAMES.some(name => user.name.includes(name));
}
