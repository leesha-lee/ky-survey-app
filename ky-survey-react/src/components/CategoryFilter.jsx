import { CATEGORIES, getCatStyle } from '../config/categories';

export default function CategoryFilter({ surveys, currentFilter, onFilterChange }) {
  if (!surveys || !surveys.length) return null;

  // Build category counts
  const catCounts = {};
  surveys.forEach(s => {
    const c = s.category || '기타';
    catCounts[c] = (catCounts[c] || 0) + 1;
  });

  const catOrder = Object.keys(CATEGORIES);
  const activeCats = catOrder.filter(c => catCounts[c]);

  if (activeCats.length <= 1) return null;

  return (
    <div className="cat-filter-bar">
      <span
        className={`cat-chip ${!currentFilter ? 'active' : ''}`}
        onClick={() => onFilterChange('')}
      >
        전체 ({surveys.length})
      </span>
      {activeCats.map(c => {
        const s = getCatStyle(c);
        return (
          <span
            key={c}
            className={`cat-chip ${currentFilter === c ? 'active' : ''}`}
            onClick={() => onFilterChange(c)}
          >
            <span className="cat-dot" style={{ background: s.color }}></span>
            {c} <span className="cat-count">{catCounts[c]}</span>
          </span>
        );
      })}
    </div>
  );
}
