import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDB } from '../hooks/useDB';
import { useAuth } from '../hooks/useAuth';
import { loadData, saveData, exportAllData, importAllData } from '../lib/db';
import { deleteSurveyBlobs, deleteDescBlobs } from '../lib/blob';
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
    if (s) {
      await deleteSurveyBlobs(s.questions);
      await deleteDescBlobs(s.descriptionImages);
    }
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

  const handleExport = useCallback(async () => {
    const exported = await exportAllData();
    const json = JSON.stringify(exported);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `survey-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const imported = JSON.parse(text);
        if (!imported.appdata) { alert('유효한 백업 파일이 아닙니다.'); return; }
        const count = (imported.appdata.surveys || []).length;
        if (!confirm(`${count}개 설문을 가져오시겠습니까? (기존 데이터는 유지됩니다)`)) return;
        await importAllData(imported);
        await refresh();
        alert('가져오기 완료!');
      } catch (err) {
        alert('파일을 읽을 수 없습니다: ' + err.message);
      }
    };
    input.click();
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
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {isAdmin(currentUser) && (
              <>
                <button className="btn" onClick={handleExport} style={{ fontSize: 13 }}>
                  내보내기
                </button>
                <button className="btn" onClick={handleImport} style={{ fontSize: 13 }}>
                  가져오기
                </button>
                <button className="btn btn-primary" onClick={() => navigate('/create')}>
                  + 새 설문 만들기
                </button>
              </>
            )}
          </div>
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
