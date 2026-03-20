import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { loadData, saveData } from '../lib/db';
import { restoreBlobs } from '../lib/blob';
import { esc, getYoutubeEmbedUrl, getSharePointEmbedUrl } from '../lib/utils';

function MsIcon() {
  return (
    <svg viewBox="0 0 21 21" style={{ width: 20, height: 20 }}>
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  );
}

function ImageLightbox({ src, alt, onClose }) {
  return (
    <div className="lightbox-overlay" onClick={onClose}>
      <button className="lightbox-close" onClick={onClose}>&times;</button>
      <img src={src} alt={alt} className="lightbox-img" onClick={e => e.stopPropagation()} />
    </div>
  );
}

function MediaDisplay({ mediaArr }) {
  const [lightbox, setLightbox] = useState(null);
  if (!mediaArr || !mediaArr.length) return null;
  const items = mediaArr.filter(m => m.url);
  if (!items.length) return null;

  return (
    <div style={{ marginBottom: 14 }}>
      {lightbox && <ImageLightbox src={lightbox.src} alt={lightbox.alt} onClose={() => setLightbox(null)} />}
      {items.map((m, i) => {
        if (m.type === 'image') {
          const spEmbed = getSharePointEmbedUrl(m.url);
          if (spEmbed) return <div className="media-preview" key={i}><iframe src={spEmbed} allowFullScreen></iframe></div>;
          return <div className="media-preview" key={i}><img src={m.url} alt={m.alt || ''} style={{ cursor: 'zoom-in' }} onClick={() => setLightbox({ src: m.url, alt: m.alt || '' })} /></div>;
        }
        if (m.type === 'video') {
          const spEmbed = getSharePointEmbedUrl(m.url);
          if (spEmbed) return <div className="media-preview" key={i}><iframe src={spEmbed} allowFullScreen></iframe></div>;
          return <div className="media-preview" key={i}><video src={m.url} controls></video></div>;
        }
        if (m.type === 'youtube') {
          const embedUrl = getYoutubeEmbedUrl(m.url);
          return embedUrl ? <div className="media-preview" key={i}><iframe src={embedUrl} allowFullScreen></iframe></div> : null;
        }
        if (m.type === 'link') {
          return (
            <div className="media-preview" key={i}>
              <a href={m.url} target="_blank" rel="noopener noreferrer" className="link-card">
                &#128279; {m.label || m.url}
              </a>
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}

export default function SurveyTake() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser, login } = useAuth();

  const [survey, setSurvey] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await loadData();
        const s = data.surveys.find(x => x.id === id);
        if (!s) { setLoading(false); return; }
        setSurvey(s);

        if (currentUser) {
          // Check duplicate
          const existing = (data.responses[id] || []).find(r => r.respondent && r.respondent.email === currentUser.email);
          if (existing && !confirm(`이미 ${new Date(existing.submittedAt).toLocaleString('ko-KR')}에 응답하셨습니다.\n다시 응답하시겠습니까? (기존 응답은 유지됩니다)`)) {
            navigate('/');
            return;
          }
          const restored = await restoreBlobs(s.questions);
          setQuestions(restored);
        }
      } catch (e) {
        console.error('Survey load failed:', e);
        setLoadError(e);
      }
      setLoading(false);
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, currentUser]);

  const handleLoginAndRetry = async () => {
    const user = await login();
    // After login, the component will re-render via useAuth state change
  };

  const setAnswer = (qi, value) => {
    setAnswers(prev => ({ ...prev, [qi]: value }));
  };

  const toggleCheckbox = (qi, value) => {
    setAnswers(prev => {
      const current = prev[qi] || [];
      const idx = current.indexOf(value);
      if (idx >= 0) {
        return { ...prev, [qi]: current.filter(v => v !== value) };
      } else {
        return { ...prev, [qi]: [...current, value] };
      }
    });
  };

  const submitResponse = async () => {
    const data = await loadData();
    const s = data.surveys.find(x => x.id === id);
    if (!s) return;

    // Validate
    for (let qi = 0; qi < s.questions.length; qi++) {
      const q = s.questions[qi];
      const a = answers[qi];
      if (q.required) {
        const empty = q.type === 'checkbox' ? (!a || !a.length) : !a;
        if (empty) return alert(`Q${qi + 1}은(는) 필수 항목입니다.`);
      }
    }

    if (!data.responses[id]) data.responses[id] = [];
    const respondent = currentUser
      ? { name: currentUser.name, email: currentUser.email, department: currentUser.department }
      : { name: '익명', email: '', department: '' };
    data.responses[id].push({ answers, submittedAt: new Date().toISOString(), respondent });
    await saveData(data);
    alert('응답이 제출되었습니다!');
    navigate('/');
  };

  if (loading) return <div className="page active"><div className="card"><div className="empty-state"><p>로딩 중...</p></div></div></div>;
  if (loadError) return <div className="page active"><div className="card"><div className="empty-state" style={{ color: '#e63946' }}><p>데이터를 불러올 수 없습니다.</p><p style={{ fontSize: 13, marginTop: 8 }}>Firestore 보안 규칙을 확인해 주세요.</p><pre style={{ fontSize: 11, background: '#f8f9fa', padding: 12, borderRadius: 8, marginTop: 8, whiteSpace: 'pre-wrap' }}>{loadError.message || String(loadError)}</pre></div></div></div>;
  if (!survey) return <div className="page active"><div className="card"><div className="empty-state"><p>설문을 찾을 수 없습니다.</p></div></div></div>;

  // Not logged in
  if (!currentUser) {
    return (
      <div className="page active">
        <div className="card">
          <h2>{survey.title}</h2>
          <p style={{ color: '#6b7280', marginBottom: 20 }}>{survey.description || ''}</p>
          <div className="login-required">
            <p>설문에 응답하려면 Microsoft 계정으로 로그인해야 합니다.</p>
            <button className="btn-ms-login" onClick={handleLoginAndRetry} style={{ fontSize: 15, padding: '10px 24px' }}>
              <MsIcon />
              Microsoft 계정으로 로그인
            </button>
          </div>
        </div>
      </div>
    );
  }

  const groupMap = {};
  (survey.questionGroups || []).forEach(g => { groupMap[g.id] = g; });

  return (
    <div className="page active">
      <div className="card">
        <h2>{survey.title}</h2>
        <p style={{ color: '#6b7280', marginBottom: 20 }}>{survey.description || ''}</p>

        <div style={{ marginBottom: 16 }}>
          <span className="respondent-tag">
            &#128100; {currentUser.name}{currentUser.department ? ' / ' + currentUser.department : ''}
          </span>
        </div>

        {questions.map((q, qi) => {
          const grp = q.group && groupMap[q.group];
          return (
            <div className="take-q" key={qi}>
              <div className="q-title">
                {grp && <span className="q-group-badge" style={{ background: grp.color }}>{grp.name}</span>}
                Q{qi + 1}. {q.title}
                {q.required && <span className="required"> *</span>}
              </div>
                <MediaDisplay mediaArr={q.media} />

                {q.type === 'radio' && (
                  <div className="radio-group">
                    {q.options.map((o, oi) => (
                      <label key={oi}>
                        <input
                          type="radio"
                          name={`q_${qi}`}
                          value={o}
                          checked={answers[qi] === o}
                          onChange={() => setAnswer(qi, o)}
                        />
                        <span>{o}</span>
                      </label>
                    ))}
                  </div>
                )}

                {q.type === 'checkbox' && (
                  <div className="check-group">
                    {q.options.map((o, oi) => (
                      <label key={oi}>
                        <input
                          type="checkbox"
                          name={`q_${qi}`}
                          value={o}
                          checked={(answers[qi] || []).includes(o)}
                          onChange={() => toggleCheckbox(qi, o)}
                        />
                        <span>{o}</span>
                      </label>
                    ))}
                  </div>
                )}

                {q.type === 'scale' && (
                  <>
                    <div className="scale-group">
                      {Array.from({ length: q.scaleMax - q.scaleMin + 1 }, (_, i) => q.scaleMin + i).map(n => (
                        <label key={n}>
                          <input
                            type="radio"
                            name={`q_${qi}`}
                            value={n}
                            checked={answers[qi] === String(n)}
                            onChange={() => setAnswer(qi, String(n))}
                          />
                          <span>{n}</span>
                        </label>
                      ))}
                    </div>
                    <div className="scale-labels">
                      <span>{q.labelMin}</span>
                      <span>{q.labelMax}</span>
                    </div>
                  </>
                )}

                {q.type === 'text' && (
                  <textarea
                    name={`q_${qi}`}
                    placeholder="답변을 입력하세요"
                    rows="3"
                    value={answers[qi] || ''}
                    onChange={(e) => setAnswer(qi, e.target.value)}
                  />
                )}
            </div>
          );
        })}

        <div style={{ textAlign: 'right', marginTop: 20 }}>
          <button className="btn btn-secondary" onClick={() => navigate('/')} style={{ marginRight: 8 }}>돌아가기</button>
          <button className="btn btn-primary" onClick={submitResponse}>응답 제출</button>
        </div>
      </div>
    </div>
  );
}
