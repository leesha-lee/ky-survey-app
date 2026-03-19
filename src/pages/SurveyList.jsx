import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDB } from '../hooks/useDB';
import { useAuth } from '../hooks/useAuth';
import { loadData, saveData } from '../lib/db';
import { deleteSurveyBlobs } from '../lib/blob';
import CategoryFilter from '../components/CategoryFilter';
import SurveyCard from '../components/SurveyCard';
import { isAdmin } from '../config/roles';

export default function SurveyList() {
  const { data, refresh } = useDB();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [categoryFilter, setCategoryFilter] = useState('');

  const handleToggleClose = useCallback(async (id) => {
    const d = await loadData();
    const s = d.surveys.find(x => x.id === id);
    if (s) {
      s.closed = !s.closed;
      await saveData(d);
      await refresh();
    }
  }, [refresh]);

  const handleDelete = useCallback(async (id) => {
    if (!confirm('이 설문을 삭제하시겠습니까? 응답 데이터도 함께 삭제됩니다.')) return;
    const d = await loadData();
    const s = d.surveys.find(x => x.id === id);
    if (s) await deleteSurveyBlobs(s.questions);
    d.surveys = d.surveys.filter(s => s.id !== id);
    delete d.responses[id];
    await saveData(d);
    await refresh();
  }, [refresh]);

  const handleEdit = useCallback((id) => {
    navigate(`/edit/${id}`);
  }, [navigate]);

  const handleDuplicate = useCallback(async (id) => {
    const d = await loadData();
    const original = d.surveys.find(x => x.id === id);
    if (!original) return;
    const copy = JSON.parse(JSON.stringify(original));
    copy.id = Date.now();
    copy.title = original.title + ' (복사)';
    copy.closed = false;
    copy.createdAt = new Date().toISOString().slice(0, 10);
    d.surveys.push(copy);
    await saveData(d);
    await refresh();
  }, [refresh]);

  const surveys = data.surveys || [];
  const filtered = categoryFilter
    ? surveys.filter(s => (s.category || '기타') === categoryFilter)
    : surveys;

  return (
    <div className="page active">
      <div className="card">
        <div className="flex-between">
          <h2>설문 목록</h2>
          {isAdmin(currentUser) && (
            <button className="btn btn-primary" onClick={() => navigate('/create')}>
              + 새 설문 만들기
            </button>
          )}
        </div>
        <CategoryFilter
          surveys={surveys}
          currentFilter={categoryFilter}
          onFilterChange={setCategoryFilter}
        />
        {!surveys.length ? (
          <div className="empty-state">
            <p>등록된 설문이 없습니다.</p>
          </div>
        ) : !filtered.length ? (
          <div className="empty-state">
            <p>해당 카테고리에 설문이 없습니다.</p>
          </div>
        ) : (
          filtered.map(s => (
            <SurveyCard
              key={s.id}
              survey={{ ...s, _responses: data.responses[s.id] || [] }}
              responseCount={(data.responses[s.id] || []).length}
              currentUser={currentUser}
              isAdmin={isAdmin(currentUser)}
              onToggleClose={handleToggleClose}
              onDelete={handleDelete}
              onEdit={handleEdit}
              onDuplicate={handleDuplicate}
            />
          ))
        )}
      </div>
    </div>
  );
}
