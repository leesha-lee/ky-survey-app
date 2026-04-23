import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDB } from '../hooks/useDB';
import { useAuth } from '../hooks/useAuth';
import { loadData, saveData, idbPut, idbGet, idbDelete } from '../lib/db';
import { deleteSurveyBlobs, compressImage } from '../lib/blob';
import { uid } from '../lib/utils';
import CategoryFilter from '../components/CategoryFilter';
import SurveyCard from '../components/SurveyCard';
import { isAdmin } from '../config/roles';

function Confetti() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#4361ee', '#2ec4b6', '#ff6b6b', '#ffd166', '#06d6a0', '#fb5607', '#8338ec', '#e63946', '#ff9f1c', '#f72585'];
    const pieces = Array.from({ length: 120 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * -canvas.height,
      w: Math.random() * 8 + 4,
      h: Math.random() * 6 + 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      vy: Math.random() * 3 + 2,
      vx: (Math.random() - 0.5) * 2,
      rot: Math.random() * 360,
      rv: (Math.random() - 0.5) * 8,
      shape: Math.random() > 0.5 ? 'rect' : 'circle',
    }));

    let frame;
    let elapsed = 0;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      elapsed++;
      const opacity = elapsed > 90 ? Math.max(0, 1 - (elapsed - 90) / 30) : 1;
      if (opacity <= 0) { canvas.style.display = 'none'; return; }
      ctx.globalAlpha = opacity;

      pieces.forEach(p => {
        p.y += p.vy;
        p.x += p.vx;
        p.rot += p.rv;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rot * Math.PI) / 180);
        ctx.fillStyle = p.color;
        if (p.shape === 'rect') {
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });

      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999 }}
    />
  );
}

function NoticeBanner({ notice, admin, onEdit, onDelete, onToggle }) {
  const [images, setImages] = useState([]);
  const [lightbox, setLightbox] = useState(null);

  useEffect(() => {
    async function loadImages() {
      const srcs = [];
      if (notice.imageKeys && notice.imageKeys.length > 0) {
        for (const key of notice.imageKeys) {
          const url = await idbGet('blobs', key);
          if (url) srcs.push(url);
        }
      } else if (notice.imageKey) {
        const url = await idbGet('blobs', notice.imageKey);
        if (url) srcs.push(url);
        else if (notice.imageUrl) srcs.push(notice.imageUrl);
      } else if (notice.imageUrl) {
        srcs.push(notice.imageUrl);
      }
      setImages(srcs);
    }
    loadImages();
  }, [notice]);

  return (
    <div className="notice-banner">
      <div className="notice-banner-content">
        <div className="notice-badge">🎉 공지</div>
        <h3 className="notice-title">{notice.title}</h3>
        {notice.content && (
          <div className="notice-body">
            {notice.content.split('\n').map((line, i) => <p key={i}>{line || '\u00A0'}</p>)}
          </div>
        )}
        {images.length > 0 && (
          <div className="notice-img-grid">
            {images.map((src, i) => (
              <img
                key={i}
                src={src}
                alt={`공지 이미지 ${i + 1}`}
                className="notice-img"
                onClick={() => setLightbox(src)}
              />
            ))}
          </div>
        )}
        {lightbox && (
          <div className="lightbox-overlay" onClick={() => setLightbox(null)}>
            <button className="lightbox-close" onClick={() => setLightbox(null)}>&times;</button>
            <img src={lightbox} alt="공지 이미지" className="lightbox-img" onClick={e => e.stopPropagation()} />
          </div>
        )}
        {admin && (
          <div className="notice-actions">
            <button className="btn btn-outline btn-sm" onClick={() => onEdit(notice)}>수정</button>
            <button className="btn btn-outline btn-sm" onClick={() => onToggle(notice)}>{notice.active ? '숨기기' : '표시'}</button>
            <button className="btn btn-danger btn-sm" onClick={() => onDelete(notice)}>삭제</button>
          </div>
        )}
      </div>
    </div>
  );
}

function NoticeForm({ initial, onSave, onCancel }) {
  const [title, setTitle] = useState(initial?.title || '');
  const [content, setContent] = useState(initial?.content || '');
  const [previews, setPreviews] = useState([]);
  const [newImages, setNewImages] = useState([]);
  const [keepKeys, setKeepKeys] = useState([]);
  const fileRef = useRef(null);

  useEffect(() => {
    if (!initial) return;
    async function loadExisting() {
      const srcs = [];
      const keys = [];
      if (initial.imageKeys && initial.imageKeys.length > 0) {
        for (const key of initial.imageKeys) {
          const url = await idbGet('blobs', key);
          if (url) { srcs.push(url); keys.push(key); }
        }
      } else if (initial.imageKey) {
        const url = await idbGet('blobs', initial.imageKey);
        if (url) { srcs.push(url); keys.push(initial.imageKey); }
        else if (initial.imageUrl) { srcs.push(initial.imageUrl); }
      } else if (initial.imageUrl) {
        srcs.push(initial.imageUrl);
      }
      setPreviews(srcs);
      setKeepKeys(keys);
    }
    loadExisting();
  }, [initial]);

  const handleFiles = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    files.forEach(file => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = async () => {
        const compressed = await compressImage(reader.result);
        setPreviews(prev => [...prev, compressed]);
        setNewImages(prev => [...prev, compressed]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const removeImage = (idx) => {
    const removed = previews[idx];
    setPreviews(prev => prev.filter((_, i) => i !== idx));
    const keyIdx = keepKeys.findIndex((_, ki) => {
      return idx < keepKeys.length && ki === idx;
    });
    if (idx < keepKeys.length) {
      setKeepKeys(prev => prev.filter((_, i) => i !== idx));
    } else {
      const newIdx = idx - keepKeys.length;
      setNewImages(prev => prev.filter((_, i) => i !== newIdx));
    }
  };

  const handleSave = () => {
    if (!title.trim()) { alert('제목을 입력해 주세요.'); return; }
    onSave({ title: title.trim(), content: content.trim(), newImages, keepKeys });
  };

  return (
    <div className="notice-form">
      <h3>{initial ? '공지 수정' : '새 공지 등록'}</h3>
      <label>제목</label>
      <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="예: 3월 설문 리워드 당첨자 발표!" />
      <label>내용</label>
      <textarea value={content} onChange={e => setContent(e.target.value)} rows={4} placeholder="당첨자 명단, 축하 메시지 등" />
      <label>이미지 {previews.length > 0 && <span style={{ color: '#2ec4b6', fontWeight: 400 }}>({previews.length}개)</span>}</label>
      {previews.length > 0 && (
        <div className="notice-img-grid notice-img-grid-edit">
          {previews.map((src, idx) => (
            <div key={idx} className="notice-img-thumb">
              <img src={src} alt="" />
              <button onClick={() => removeImage(idx)}>&times;</button>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14 }}>
        <button className="btn btn-outline btn-sm" onClick={() => fileRef.current?.click()}>이미지 추가</button>
        <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleFiles} />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-primary" onClick={handleSave}>저장</button>
        <button className="btn btn-secondary" onClick={onCancel}>취소</button>
      </div>
    </div>
  );
}

export default function SurveyList() {
  const { data, refresh, error } = useDB();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingNotice, setEditingNotice] = useState(null);
  const [hiddenNotices, setHiddenNotices] = useState({});
  const [showConfetti, setShowConfetti] = useState(false);

  const notices = (data.notices || []).filter(n => n.active && !hiddenNotices[n.id]);

  useEffect(() => {
    if (notices.length > 0) {
      setShowConfetti(true);
      const t = setTimeout(() => setShowConfetti(false), 4000);
      return () => clearTimeout(t);
    }
  }, [notices.length > 0]);

  const handleSaveNotice = useCallback(async ({ title, content, newImages, keepKeys }) => {
    const d = await loadData();
    if (!d.notices) d.notices = [];

    if (editingNotice) {
      const n = d.notices.find(x => x.id === editingNotice.id);
      if (n) {
        n.title = title;
        n.content = content;
        const oldKeys = n.imageKeys || (n.imageKey ? [n.imageKey] : []);
        for (const oldKey of oldKeys) {
          if (!keepKeys.includes(oldKey)) await idbDelete('blobs', oldKey);
        }
        const allKeys = [...keepKeys];
        for (const imgData of newImages) {
          const key = 'notice_' + uid();
          await idbPut('blobs', key, imgData);
          allKeys.push(key);
        }
        n.imageKeys = allKeys;
        delete n.imageKey;
        delete n.imageUrl;
      }
    } else {
      const n = { id: uid(), title, content, active: true, createdAt: new Date().toISOString(), imageKeys: [] };
      for (const imgData of newImages) {
        const key = 'notice_' + uid();
        await idbPut('blobs', key, imgData);
        n.imageKeys.push(key);
      }
      d.notices.push(n);
    }

    await saveData(d);
    setShowForm(false);
    setEditingNotice(null);
    await refresh();
  }, [editingNotice, refresh]);

  const handleDeleteNotice = useCallback(async (notice) => {
    if (!confirm(`"${notice.title}" 공지를 삭제하시겠습니까?`)) return;
    const d = await loadData();
    const keys = notice.imageKeys || (notice.imageKey ? [notice.imageKey] : []);
    for (const key of keys) await idbDelete('blobs', key);
    d.notices = (d.notices || []).filter(n => n.id !== notice.id);
    await saveData(d);
    await refresh();
  }, [refresh]);

  const handleToggleNotice = useCallback(async (notice) => {
    const d = await loadData();
    const n = (d.notices || []).find(x => x.id === notice.id);
    if (n) { n.active = !n.active; await saveData(d); await refresh(); }
  }, [refresh]);

  const handleEditNotice = useCallback((notice) => {
    setEditingNotice(notice);
    setShowForm(true);
  }, []);

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
    copy.id = String(Date.now());
    copy.title = original.title + ' (복사)';
    copy.closed = false;
    copy.createdAt = new Date().toISOString().slice(0, 10);
    d.surveys.push(copy);
    await saveData(d);
    await refresh();
  }, [refresh]);

  const admin = isAdmin(currentUser);
  const surveys = data.surveys || [];
  const allNotices = data.notices || [];
  const filtered = categoryFilter
    ? surveys.filter(s => (s.category || '기타') === categoryFilter)
    : surveys;

  return (
    <div className="page active">
      {showConfetti && <Confetti />}

      {/* Active notices */}
      {notices.map(n => (
        <NoticeBanner
          key={n.id}
          notice={n}
          admin={admin}
          onEdit={handleEditNotice}
          onDelete={handleDeleteNotice}
          onToggle={handleToggleNotice}
        />
      ))}

      {/* Admin: hidden/inactive notices */}
      {admin && allNotices.filter(n => !n.active).length > 0 && (
        <details className="notice-hidden-section">
          <summary>비활성 공지 ({allNotices.filter(n => !n.active).length}건)</summary>
          {allNotices.filter(n => !n.active).map(n => (
            <NoticeBanner
              key={n.id}
              notice={n}
              admin={admin}
              onEdit={handleEditNotice}
              onDelete={handleDeleteNotice}
              onToggle={handleToggleNotice}
            />
          ))}
        </details>
      )}

      {/* Notice form */}
      {showForm && (
        <div className="card">
          <NoticeForm
            initial={editingNotice}
            onSave={handleSaveNotice}
            onCancel={() => { setShowForm(false); setEditingNotice(null); }}
          />
        </div>
      )}

      <div className="card">
        <div className="flex-between">
          <h2>설문 목록</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            {admin && !showForm && (
              <button className="btn btn-success" onClick={() => { setEditingNotice(null); setShowForm(true); }}>
                📢 공지 등록
              </button>
            )}
            {admin && (
              <button className="btn btn-primary" onClick={() => navigate('/create')}>
                + 새 설문 만들기
              </button>
            )}
          </div>
        </div>
        <CategoryFilter
          surveys={surveys}
          currentFilter={categoryFilter}
          onFilterChange={setCategoryFilter}
        />
        {error ? (
          <div className="empty-state" style={{ color: '#e63946' }}>
            <p>데이터를 불러올 수 없습니다.</p>
            <p style={{ fontSize: 13, marginTop: 8 }}>Firestore 보안 규칙을 확인해 주세요. Firebase Console &gt; Firestore Database &gt; Rules 에서 읽기/쓰기를 허용해야 합니다.</p>
            <pre style={{ fontSize: 11, background: '#f8f9fa', padding: 12, borderRadius: 8, marginTop: 8, textAlign: 'left', whiteSpace: 'pre-wrap' }}>{error.message || String(error)}</pre>
            <button className="btn btn-outline" style={{ marginTop: 12 }} onClick={refresh}>다시 시도</button>
          </div>
        ) : !surveys.length ? (
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
