import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { loadData, saveData } from '../lib/db';
import { restoreBlobs, saveSurveyData, deleteSurveyBlobs } from '../lib/blob';
import { uid, esc, formatFileSize, getYoutubeEmbedUrl, getSharePointEmbedUrl, sanitizeVideoUrl } from '../lib/utils';
import { fetchADDepartments, getMainDepartments } from '../lib/adDepartments';
import { loginRequest } from '../config/msal';
import { CATEGORIES } from '../config/categories';

const GROUP_COLORS = ['#4361ee', '#2ec4b6', '#e63946', '#ffd166', '#06d6a0', '#8338ec', '#fb5607', '#118ab2', '#3a86a7', '#ff006e'];
const TYPE_LABELS = { radio: '객관식 (단일)', checkbox: '객관식 (복수)', scale: '척도', text: '주관식' };

function MsIcon({ size = 14 }) {
  return (
    <svg viewBox="0 0 21 21" style={{ width: size, height: size }}>
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  );
}

function MediaPreview({ m }) {
  if (!m.url || m.url.startsWith('fs://') || m.url.startsWith('idb://')) return null;
  if (m.type === 'image') {
    const spEmbed = getSharePointEmbedUrl(m.url);
    if (spEmbed) {
      return (
        <div className="media-preview">
          <iframe src={spEmbed} allowFullScreen style={{ maxHeight: 250 }}></iframe>
        </div>
      );
    }
    return (
      <div className="media-preview">
        <img src={m.url} alt={m.alt || ''} onError={e => { e.target.style.display = 'none'; }} />
      </div>
    );
  }
  if (m.type === 'video') {
    const spEmbed = getSharePointEmbedUrl(m.url);
    if (spEmbed) {
      return (
        <div className="media-preview">
          <iframe src={spEmbed} allowFullScreen style={{ maxHeight: 250 }}></iframe>
        </div>
      );
    }
    return (
      <div className="media-preview">
        <video src={m.url} controls style={{ maxHeight: 200 }}></video>
      </div>
    );
  }
  if (m.type === 'youtube') {
    const embedUrl = getYoutubeEmbedUrl(m.url);
    return embedUrl ? (
      <div className="media-preview">
        <iframe src={embedUrl} allowFullScreen style={{ maxHeight: 250 }}></iframe>
      </div>
    ) : (
      <p style={{ color: '#e63946', fontSize: 13 }}>유효한 YouTube URL을 입력하세요.</p>
    );
  }
  if (m.type === 'link') {
    return (
      <div className="media-preview">
        <a href={m.url} target="_blank" rel="noopener noreferrer" className="link-card">
          &#128279; {m.label || m.url}
        </a>
      </div>
    );
  }
  return null;
}

export default function SurveyCreate() {
  const { id: editId } = useParams();
  const navigate = useNavigate();
  const { currentUser, msalInstance } = useAuth();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState([]);
  const [questionGroups, setQuestionGroups] = useState([]);
  const [newGroupName, setNewGroupName] = useState('');

  // Load survey for editing
  useEffect(() => {
    if (!editId) {
      // Reset form for create mode
      setTitle('');
      setCategory('');
      setDescription('');
      setQuestions([]);
      setQuestionGroups([]);
      return;
    }
    async function load() {
      const data = await loadData();
      const s = data.surveys.find(x => x.id === editId);
      if (!s) return;
      setTitle(s.title);
      setCategory(s.category || '');
      setDescription(s.description || '');
      const restored = await restoreBlobs(s.questions);
      setQuestions(restored);
      setQuestionGroups(s.questionGroups ? JSON.parse(JSON.stringify(s.questionGroups)) : []);
    }
    load();
  }, [editId]);

  const updateQuestion = useCallback((qi, updates) => {
    setQuestions(prev => prev.map((q, i) => i === qi ? { ...q, ...updates } : q));
  }, []);

  const addGroup = () => {
    const name = newGroupName.trim();
    if (!name) return;
    if (questionGroups.some(g => g.name === name)) {
      alert('같은 이름의 그룹이 이미 있습니다.');
      return;
    }
    setQuestionGroups(prev => [...prev, { id: 'grp_' + uid(), name, color: GROUP_COLORS[prev.length % GROUP_COLORS.length] }]);
    setNewGroupName('');
  };

  const removeGroup = (gid) => {
    if (!confirm('이 그룹을 삭제하시겠습니까? 질문은 그대로 유지됩니다.')) return;
    setQuestionGroups(prev => prev.filter(g => g.id !== gid));
    setQuestions(prev => prev.map(q => q.group === gid ? { ...q, group: '' } : q));
  };

  const addQuestion = (type) => {
    const q = { id: uid(), type, title: '', required: true, options: [], media: [], group: '' };
    if (type === 'radio' || type === 'checkbox') q.options = ['옵션 1', '옵션 2'];
    if (type === 'scale') { q.scaleMin = 1; q.scaleMax = 5; q.labelMin = '매우 불만족'; q.labelMax = '매우 만족'; }
    setQuestions(prev => [...prev, q]);
  };

  const removeQuestion = (qi) => {
    setQuestions(prev => prev.filter((_, i) => i !== qi));
  };

  const moveQuestion = (qi, dir) => {
    setQuestions(prev => {
      const arr = [...prev];
      const target = qi + dir;
      if (target < 0 || target >= arr.length) return prev;
      [arr[qi], arr[target]] = [arr[target], arr[qi]];
      return arr;
    });
  };

  const addOption = (qi) => {
    setQuestions(prev => prev.map((q, i) =>
      i === qi ? { ...q, options: [...q.options, '옵션 ' + (q.options.length + 1)] } : q
    ));
  };

  const removeOption = (qi, oi) => {
    setQuestions(prev => prev.map((q, i) =>
      i === qi ? { ...q, options: q.options.filter((_, j) => j !== oi) } : q
    ));
  };

  const updateOption = (qi, oi, value) => {
    setQuestions(prev => prev.map((q, i) =>
      i === qi ? { ...q, options: q.options.map((o, j) => j === oi ? value : o) } : q
    ));
  };

  const addMedia = (qi, type) => {
    setQuestions(prev => prev.map((q, i) =>
      i === qi ? { ...q, media: [...(q.media || []), { type, url: '', label: '', alt: '', source: 'url', fileName: '', fileSize: '' }] } : q
    ));
  };

  const removeMedia = (qi, mi) => {
    setQuestions(prev => prev.map((q, i) =>
      i === qi ? { ...q, media: q.media.filter((_, j) => j !== mi) } : q
    ));
  };

  const updateMedia = (qi, mi, updates) => {
    setQuestions(prev => prev.map((q, i) =>
      i === qi ? { ...q, media: q.media.map((m, j) => j === mi ? { ...m, ...updates } : m) } : q
    ));
  };

  const processFile = (file, qi, mi) => {
    const m = questions[qi].media[mi];
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) { alert('파일 크기가 50MB를 초과합니다.'); return; }
    if (m.type === 'image' && !file.type.startsWith('image/')) { alert('이미지 파일만 업로드 가능합니다.'); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      updateMedia(qi, mi, {
        url: e.target.result,
        fileName: file.name,
        fileSize: formatFileSize(file.size),
        source: 'file',
      });
    };
    reader.readAsDataURL(file);
  };

  const addMultipleImages = (qi, files) => {
    const maxSize = 50 * 1024 * 1024;
    const imageFiles = Array.from(files).filter(f => {
      if (!f.type.startsWith('image/')) return false;
      if (f.size > maxSize) { alert(`${f.name}: 파일 크기가 50MB를 초과합니다.`); return false; }
      return true;
    });
    if (!imageFiles.length) return;
    const newMedia = imageFiles.map(f => ({ type: 'image', url: '', label: '', alt: '', source: 'file', fileName: f.name, fileSize: formatFileSize(f.size) }));
    setQuestions(prev => prev.map((q, i) => i === qi ? { ...q, media: [...(q.media || []), ...newMedia] } : q));
    const baseIndex = (questions[qi].media || []).length;
    imageFiles.forEach((f, fi) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setQuestions(prev => prev.map((q, i) => {
          if (i !== qi) return q;
          const media = [...q.media];
          const mi = baseIndex + fi;
          if (media[mi]) media[mi] = { ...media[mi], url: e.target.result };
          return { ...q, media };
        }));
      };
      reader.readAsDataURL(f);
    });
  };

  const handleFileSelect = (e, qi, mi) => {
    const f = e.target.files[0];
    if (f) processFile(f, qi, mi);
  };

  const handleFileDrop = (e, qi, mi) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) processFile(f, qi, mi);
  };

  const addDeptQuestion = async () => {
    if (!currentUser) {
      alert('Azure AD 부서 목록을 불러오려면 먼저 Microsoft 로그인이 필요합니다.');
      return;
    }
    const q = { id: uid(), type: 'radio', title: '소속 부서를 선택해 주세요.', required: true, options: ['로딩 중...'], media: [], group: '' };
    setQuestions(prev => [...prev, q]);
    try {
      const depts = await fetchADDepartments(msalInstance, loginRequest);
      const main = getMainDepartments(depts, 5);
      const opts = main.map(d => {
        const parts = d.name.split(' _ ');
        return parts.length > 1 ? parts[1].trim() + ' (' + parts[0].trim() + ')' : d.name;
      });
      if (opts.length === 0) opts.push('부서 정보 없음');
      opts.push('기타');
      setQuestions(prev => prev.map(item => item.id === q.id ? { ...item, options: opts } : item));
    } catch (e) {
      setQuestions(prev => prev.map(item => item.id === q.id ? { ...item, options: ['부서 정보를 불러올 수 없습니다.'] } : item));
    }
  };

  const loadADOptionsToQuestion = async (qi) => {
    if (!currentUser) { alert('Microsoft 로그인이 필요합니다.'); return; }
    const q = questions[qi];
    if (!q || (q.type !== 'radio' && q.type !== 'checkbox')) return;
    updateQuestion(qi, { options: ['로딩 중...'] });
    try {
      const depts = await fetchADDepartments(msalInstance, loginRequest);
      const main = getMainDepartments(depts, 5);
      const opts = main.map(d => {
        const parts = d.name.split(' _ ');
        return parts.length > 1 ? parts[1].trim() + ' (' + parts[0].trim() + ')' : d.name;
      });
      if (opts.length === 0) opts.push('부서 정보 없음');
      opts.push('기타');
      updateQuestion(qi, { options: opts });
    } catch (e) {
      updateQuestion(qi, { options: ['불러오기 실패'] });
    }
  };

  const saveSurvey = async () => {
    if (!title.trim()) return alert('설문 제목을 입력하세요.');
    if (!category) return alert('카테고리를 선택하세요.');
    if (!questions.length) return alert('최소 1개 이상의 질문을 추가하세요.');
    for (let i = 0; i < questions.length; i++) {
      if (!questions[i].title.trim()) return alert(`Q${i + 1}의 질문을 입력하세요.`);
    }

    const data = await loadData();
    const cleaned = await saveSurveyData(data, questions);

    if (editId) {
      const idx = data.surveys.findIndex(s => s.id === editId);
      if (idx >= 0) {
        await deleteSurveyBlobs(data.surveys[idx].questions);
        data.surveys[idx].title = title.trim();
        data.surveys[idx].category = category;
        data.surveys[idx].description = description.trim();
        data.surveys[idx].questions = cleaned;
        data.surveys[idx].questionGroups = JSON.parse(JSON.stringify(questionGroups));
      }
    } else {
      data.surveys.push({
        id: uid(),
        title: title.trim(),
        category,
        description: description.trim(),
        questions: cleaned,
        questionGroups: JSON.parse(JSON.stringify(questionGroups)),
        createdAt: new Date().toLocaleDateString('ko-KR'),
        closed: false,
      });
    }
    await saveData(data);
    navigate('/');
  };

  const renderMediaItem = (qi, m, mi) => {
    const source = m.source || 'url';
    const isFile = m.type === 'image';
    const hasFile = m.fileName && m.url && (m.url.startsWith('data:') || m.url.startsWith('fs://') || m.url.startsWith('idb://'));

    return (
      <div key={mi}>
        <div className="media-item">
          <select
            value={m.type}
            onChange={(e) => updateMedia(qi, mi, { type: e.target.value, source: 'url', url: '', fileName: '' })}
          >
            <option value="image">이미지</option>
            <option value="video">동영상</option>
            <option value="youtube">YouTube</option>
            <option value="link">URL 링크</option>
          </select>
          <div style={{ flex: 1 }}>
            {isFile && (
              <div className="media-source-toggle">
                <button className={source === 'url' ? 'active' : ''} onClick={() => updateMedia(qi, mi, { source: 'url' })}>URL 입력</button>
                <button className={source === 'file' ? 'active' : ''} onClick={() => updateMedia(qi, mi, { source: 'file' })}>파일 업로드</button>
              </div>
            )}
            {isFile && source === 'file' ? (
              hasFile ? (
                <div className="file-info">
                  <span className="file-name">{m.fileName}</span>
                  <span className="file-size">{m.fileSize || ''}</span>
                  <button className="btn btn-danger btn-sm" onClick={() => updateMedia(qi, mi, { url: '', fileName: '', fileSize: '' })}>제거</button>
                </div>
              ) : (
                <div
                  className="upload-zone"
                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('dragover'); }}
                  onDragLeave={(e) => { e.currentTarget.classList.remove('dragover'); }}
                  onDrop={(e) => handleFileDrop(e, qi, mi)}
                >
                  <div className="upload-icon">{m.type === 'image' ? '\u{1F4F7}' : '\u{1F3A6}'}</div>
                  <div className="upload-text"><strong>클릭</strong>하거나 파일을 <strong>드래그</strong>하세요</div>
                  <div className="upload-text">{m.type === 'image' ? 'JPG, PNG, GIF, SVG, WebP' : 'MP4, WebM, OGG'} (최대 50MB)</div>
                  <input type="file" accept={m.type === 'image' ? 'image/*' : 'video/*'} onChange={(e) => handleFileSelect(e, qi, mi)} />
                </div>
              )
            ) : isFile && source === 'url' ? (
              <>
                <input
                  type="text"
                  value={!hasFile ? (m.url || '') : ''}
                  onChange={(e) => updateMedia(qi, mi, { url: sanitizeVideoUrl(e.target.value), fileName: '' })}
                  onPaste={(e) => {
                    const text = e.clipboardData.getData('text');
                    if (text.includes('<iframe')) {
                      e.preventDefault();
                      updateMedia(qi, mi, { url: sanitizeVideoUrl(text), fileName: '' });
                    }
                  }}
                  placeholder="이미지 URL 또는 SharePoint <iframe> 임베드 코드 붙여넣기"
                />
                {m.type === 'image' && (
                  <input
                    type="text"
                    value={m.alt || ''}
                    onChange={(e) => updateMedia(qi, mi, { alt: e.target.value })}
                    placeholder="이미지 설명 (선택)"
                    style={{ marginTop: -6 }}
                  />
                )}
              </>
            ) : m.type === 'video' ? (
              <input
                type="text"
                value={m.url || ''}
                onChange={(e) => updateMedia(qi, mi, { url: sanitizeVideoUrl(e.target.value), fileName: '' })}
                onPaste={(e) => {
                  const text = e.clipboardData.getData('text');
                  if (text.includes('<iframe')) {
                    e.preventDefault();
                    updateMedia(qi, mi, { url: sanitizeVideoUrl(text), fileName: '' });
                  }
                }}
                placeholder="동영상 URL 또는 SharePoint <iframe> 임베드 코드 붙여넣기"
              />
            ) : m.type === 'youtube' ? (
              <input
                type="url"
                value={m.url || ''}
                onChange={(e) => updateMedia(qi, mi, { url: e.target.value })}
                placeholder="YouTube URL"
              />
            ) : m.type === 'link' ? (
              <>
                <input
                  type="url"
                  value={m.url || ''}
                  onChange={(e) => updateMedia(qi, mi, { url: e.target.value })}
                  placeholder="링크 URL"
                />
                <input
                  type="text"
                  value={m.label || ''}
                  onChange={(e) => updateMedia(qi, mi, { label: e.target.value })}
                  placeholder="링크 표시 텍스트 (선택)"
                  style={{ marginTop: -6 }}
                />
              </>
            ) : null}
          </div>
          <button className="btn btn-danger btn-sm" onClick={() => removeMedia(qi, mi)}>&times;</button>
        </div>
        {m.url && !m.url.startsWith('fs://') && !m.url.startsWith('idb://') && <MediaPreview m={m} />}
      </div>
    );
  };

  const renderQuestionItem = (q, qi) => {
    const grp = q.group && questionGroups.find(g => g.id === q.group);

    return (
      <div className="q-item" key={q.id}>
        <div className="q-num">
          Q{qi + 1}. {TYPE_LABELS[q.type]}
          {grp && (
            <span className="q-group-badge" style={{ background: grp.color }}>{grp.name}</span>
          )}
        </div>
        <div className="q-actions">
          <button className="q-move" onClick={() => moveQuestion(qi, -1)} disabled={qi === 0} title="위로 이동">&#9650;</button>
          <button className="q-move" onClick={() => moveQuestion(qi, 1)} disabled={qi === questions.length - 1} title="아래로 이동">&#9660;</button>
          <button className="q-remove" onClick={() => removeQuestion(qi)}>&times;</button>
        </div>

        {questionGroups.length > 0 && (
          <select
            className="q-group-select"
            value={q.group || ''}
            onChange={(e) => updateQuestion(qi, { group: e.target.value })}
          >
            <option value="">그룹 없음</option>
            {questionGroups.map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        )}

        <label>질문 *</label>
        <input
          type="text"
          value={q.title}
          onChange={(e) => updateQuestion(qi, { title: e.target.value })}
          placeholder="질문을 입력하세요"
        />
        <label style={{ fontWeight: 400 }}>
          <input
            type="checkbox"
            checked={q.required}
            onChange={(e) => updateQuestion(qi, { required: e.target.checked })}
            style={{ width: 'auto', marginRight: 6 }}
          />
          필수 응답
        </label>

        {/* Options for radio/checkbox */}
        {(q.type === 'radio' || q.type === 'checkbox') && (
          <>
            {q.options.map((o, oi) => (
              <div className="option-row" key={oi}>
                <input
                  type="text"
                  value={o}
                  onChange={(e) => updateOption(qi, oi, e.target.value)}
                  placeholder="옵션"
                />
                <button className="btn btn-danger btn-sm" onClick={() => removeOption(qi, oi)}>&times;</button>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <button className="add-option-btn" onClick={() => addOption(qi)}>+ 옵션 추가</button>
              <button className="btn-ad" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => loadADOptionsToQuestion(qi)}>
                <MsIcon size={12} />AD 부서 불러오기
              </button>
            </div>
          </>
        )}

        {/* Scale options */}
        {q.type === 'scale' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label>최소값</label>
              <input type="number" value={q.scaleMin} onChange={(e) => updateQuestion(qi, { scaleMin: +e.target.value })} />
            </div>
            <div>
              <label>최대값</label>
              <input type="number" value={q.scaleMax} onChange={(e) => updateQuestion(qi, { scaleMax: +e.target.value })} />
            </div>
            <div>
              <label>최소 라벨</label>
              <input type="text" value={q.labelMin} onChange={(e) => updateQuestion(qi, { labelMin: e.target.value })} />
            </div>
            <div>
              <label>최대 라벨</label>
              <input type="text" value={q.labelMax} onChange={(e) => updateQuestion(qi, { labelMax: e.target.value })} />
            </div>
          </div>
        )}

        {/* Media section */}
        <details className="media-section" open={q.media && q.media.length > 0}>
          <summary>
            미디어 첨부 {q.media && q.media.length > 0 && (
              <span style={{ color: '#2ec4b6' }}>({q.media.length}개)</span>
            )}
          </summary>
          <div className="media-body">
            {(q.media || []).map((m, mi) => renderMediaItem(qi, m, mi))}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6, alignItems: 'center' }}>
              <button className="btn btn-outline btn-sm" onClick={() => addMedia(qi, 'image')}>+ 이미지</button>
              <label className="btn btn-outline btn-sm" style={{ cursor: 'pointer', margin: 0 }}>
                + 이미지 다중 업로드
                <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={(e) => { addMultipleImages(qi, e.target.files); e.target.value = ''; }} />
              </label>
              <button className="btn btn-outline btn-sm" onClick={() => addMedia(qi, 'video')}>+ 동영상</button>
              <button className="btn btn-outline btn-sm" onClick={() => addMedia(qi, 'youtube')}>+ YouTube</button>
              <button className="btn btn-outline btn-sm" onClick={() => addMedia(qi, 'link')}>+ URL 링크</button>
            </div>
          </div>
        </details>
      </div>
    );
  };

  return (
    <div className="page active">
      <div className="card">
        <h2>{editId ? '설문 수정' : '새 설문 만들기'}</h2>
        <label>설문 제목 *</label>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 고객 만족도 조사" />
        <label>카테고리 *</label>
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">-- 카테고리 선택 --</option>
          {Object.keys(CATEGORIES).map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <label>설문 설명</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="설문에 대한 간단한 설명을 입력하세요" />
      </div>

      <div className="card">
        {/* Group Manager */}
        <div className="group-manager">
          <h4>질문 그룹 관리</h4>
          <div className="group-tags">
            {!questionGroups.length ? (
              <span style={{ fontSize: 13, color: '#9ca3af' }}>그룹이 없습니다. 비슷한 질문을 묶어 관리하세요.</span>
            ) : (
              questionGroups.map(g => {
                const cnt = questions.filter(q => q.group === g.id).length;
                return (
                  <span className="group-tag" key={g.id}>
                    <span className="group-color" style={{ background: g.color }}></span>
                    {g.name} <small style={{ opacity: 0.7 }}>({cnt})</small>
                    <button
                      className="group-remove"
                      onClick={(e) => { e.stopPropagation(); removeGroup(g.id); }}
                      title="그룹 삭제"
                    >
                      &times;
                    </button>
                  </span>
                );
              })
            )}
          </div>
          <div className="group-add-row">
            <input
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="새 그룹 이름 (예: 업무 환경, 복리후생)"
              onKeyDown={(e) => { if (e.key === 'Enter') addGroup(); }}
            />
            <button className="btn btn-outline btn-sm" onClick={addGroup}>+ 그룹 추가</button>
          </div>
        </div>

        {/* Question Builder */}
        <div className="sticky-toolbar">
          <h3 style={{ margin: 0 }}>질문 목록</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-outline btn-sm" onClick={() => addQuestion('radio')}>객관식 (단일)</button>
            <button className="btn btn-outline btn-sm" onClick={() => addQuestion('checkbox')}>객관식 (복수)</button>
            <button className="btn btn-outline btn-sm" onClick={() => addQuestion('scale')}>척도</button>
            <button className="btn btn-outline btn-sm" onClick={() => addQuestion('text')}>주관식</button>
          </div>
        </div>

        {questions.map((q, qi) => renderQuestionItem(q, qi))}
        {!questions.length && (
          <div className="empty-state" style={{ padding: 24 }}>
            <p>아직 질문이 없습니다. 위 버튼으로 질문을 추가하세요.</p>
          </div>
        )}
      </div>

      <div className="sticky-bottom-bar">
        <button className="btn btn-secondary" onClick={() => navigate('/')}>취소</button>
        <button className="btn btn-success" onClick={saveSurvey}>설문 저장</button>
      </div>
    </div>
  );
}
