import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { loadData } from '../lib/db';
import { restoreBlobs } from '../lib/blob';
import { esc, getMedian, getMode, getStdDev, csvEsc, getYoutubeEmbedUrl, groupQuestions } from '../lib/utils';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

const COLORS = ['#4361ee', '#2ec4b6', '#ff6b6b', '#ffd166', '#06d6a0', '#118ab2', '#8338ec', '#fb5607', '#3a86a7', '#e63946'];

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
        if (m.type === 'image') return <div className="media-preview" key={i}><img src={m.url} alt={m.alt || ''} style={{ cursor: 'zoom-in' }} onClick={() => setLightbox({ src: m.url, alt: m.alt || '' })} /></div>;
        if (m.type === 'video') return <div className="media-preview" key={i}><video src={m.url} controls></video></div>;
        if (m.type === 'youtube') { const e = getYoutubeEmbedUrl(m.url); return e ? <div className="media-preview" key={i}><iframe src={e} allowFullScreen></iframe></div> : null; }
        if (m.type === 'link') return <div className="media-preview" key={i}><a href={m.url} target="_blank" rel="noopener noreferrer" className="link-card">&#128279; {m.label || m.url}</a></div>;
        return null;
      })}
    </div>
  );
}

export default function SurveyReport() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [survey, setSurvey] = useState(null);
  const [allResponses, setAllResponses] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [deptFilter, setDeptFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const data = await loadData();
      const s = data.surveys.find(x => x.id === id);
      if (!s) { setLoading(false); return; }
      setSurvey(s);
      setAllResponses(data.responses[id] || []);
      const restored = await restoreBlobs(s.questions);
      setQuestions(restored);
      setLoading(false);
    }
    load();
  }, [id]);

  const deptSet = useMemo(() => {
    const d = {};
    allResponses.forEach(r => {
      const dept = (r.respondent && r.respondent.department) ? r.respondent.department : '(미지정)';
      d[dept] = (d[dept] || 0) + 1;
    });
    return d;
  }, [allResponses]);

  const responses = useMemo(() => {
    if (!deptFilter) return allResponses;
    return allResponses.filter(r => {
      const d = (r.respondent && r.respondent.department) ? r.respondent.department : '(미지정)';
      return d === deptFilter;
    });
  }, [allResponses, deptFilter]);

  const exportCSV = () => {
    if (!survey || !responses.length) { alert('내보낼 데이터가 없습니다.'); return; }
    let csv = '\uFEFF';
    const headers = ['#', '응답자', '이메일', '부서', '제출일시', ...survey.questions.map((q, i) => `Q${i + 1}. ${q.title}`)];
    csv += headers.map(csvEsc).join(',') + '\n';
    responses.forEach((r, ri) => {
      const rsp = r.respondent || {};
      const row = [ri + 1, rsp.name || '익명', rsp.email || '', rsp.department || '', new Date(r.submittedAt).toLocaleString('ko-KR')];
      survey.questions.forEach((q, qi) => {
        const a = r.answers[qi];
        row.push(Array.isArray(a) ? a.join('; ') : (a || ''));
      });
      csv += row.map(csvEsc).join(',') + '\n';
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = survey.title + '_응답데이터.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="page active"><div className="card"><div className="empty-state"><p>로딩 중...</p></div></div></div>;
  if (!survey) return <div className="page active"><div className="card"><div className="empty-state"><p>설문을 찾을 수 없습니다.</p></div></div></div>;

  const grpCount = survey.questionGroups && survey.questionGroups.length ? survey.questionGroups.length : 0;
  const uniqueRespondents = new Set(responses.filter(r => r.respondent && r.respondent.email).map(r => r.respondent.email)).size;
  const deptCounts = {};
  responses.forEach(r => {
    const dept = (r.respondent && r.respondent.department) ? r.respondent.department : '(미지정)';
    deptCounts[dept] = (deptCounts[dept] || 0) + 1;
  });
  const showDeptChart = Object.keys(deptCounts).length > 1 || (Object.keys(deptCounts).length === 1 && !deptCounts['(미지정)']);
  const reportSections = groupQuestions(questions, survey.questionGroups);

  return (
    <div className="page active">
      {/* Header */}
      <div className="card no-print">
        <div className="flex-between">
          <h2>{survey.title} - 통계 리포트</h2>
          <div>
            <button className="btn btn-outline btn-sm" onClick={() => window.print()}>인쇄 / PDF</button>
            <button className="btn btn-outline btn-sm" onClick={exportCSV} style={{ marginLeft: 4 }}>CSV 내보내기</button>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/')} style={{ marginLeft: 4 }}>돌아가기</button>
          </div>
        </div>
        {Object.keys(deptSet).length > 1 && (
          <div className="dept-filter">
            <label>부서 필터:</label>
            <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
              <option value="">전체 부서</option>
              {Object.entries(deptSet).sort((a, b) => b[1] - a[1]).map(([d, c]) => (
                <option key={d} value={d}>{d} ({c}명)</option>
              ))}
            </select>
            {deptFilter && (
              <span style={{ fontSize: 13, color: '#6b7280' }}>
                {responses.length}건 / 전체 {allResponses.length}건
              </span>
            )}
          </div>
        )}
      </div>

      {!responses.length ? (
        <div className="card"><div className="empty-state"><p>아직 응답 데이터가 없습니다.</p></div></div>
      ) : (
        <>
          {/* Summary */}
          <div className="card">
            <h3>응답 요약</h3>
            <div className="stat-summary">
              <div className="stat-box"><div className="num">{responses.length}</div><div className="label">총 응답수</div></div>
              <div className="stat-box"><div className="num">{uniqueRespondents || '-'}</div><div className="label">응답자수</div></div>
              <div className="stat-box"><div className="num">{questions.length}</div><div className="label">질문수</div></div>
              {grpCount > 0 && <div className="stat-box"><div className="num">{grpCount}</div><div className="label">그룹수</div></div>}
              <div className="stat-box">
                <div className="num">{new Date(responses[responses.length - 1].submittedAt).toLocaleDateString('ko-KR')}</div>
                <div className="label">최근 응답일</div>
              </div>
            </div>

            {/* Department distribution */}
            {showDeptChart && (
              <div className="dept-chart-section">
                <h3 style={{ fontSize: 15, marginBottom: 12 }}>부서별 응답 분포</h3>
                {Object.entries(deptCounts).sort((a, b) => b[1] - a[1]).map(([dept, cnt], i) => {
                  const p = Math.round(cnt / responses.length * 100);
                  return (
                    <div key={dept} style={{ marginBottom: 6 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 3 }}>
                        <span>{dept}</span><span>{cnt}명 ({p}%)</span>
                      </div>
                      <div className="progress-bar">
                        <div className="fill" style={{ width: `${p}%`, background: COLORS[i % COLORS.length] }}>
                          {p > 10 ? p + '%' : ''}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div className="chart-container">
                  <Doughnut
                    data={{
                      labels: Object.keys(deptCounts),
                      datasets: [{ data: Object.values(deptCounts), backgroundColor: COLORS.slice(0, Object.keys(deptCounts).length) }],
                    }}
                    options={{ responsive: true, plugins: { legend: { position: 'bottom' } } }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Per-question analysis */}
          {reportSections.map((sec, si) => (
            <div key={si}>
              {sec.group ? (
                <div className="report-group-header">
                  <h3><span className="group-dot" style={{ background: sec.group.color }}></span>{sec.group.name}</h3>
                  <p>{sec.questions.length}개 항목</p>
                </div>
              ) : reportSections.length > 1 ? (
                <div className="report-group-header">
                  <h3><span className="group-dot" style={{ background: '#9ca3af' }}></span>기타 항목</h3>
                  <p>{sec.questions.length}개 항목</p>
                </div>
              ) : null}

              {sec.questions.map(({ q, qi }) => (
                <QuestionReport key={qi} q={q} qi={qi} responses={responses} />
              ))}
            </div>
          ))}

          {/* Full response table */}
          <div className="card">
            <h3>전체 응답 데이터</h3>
            <div style={{ overflowX: 'auto' }}>
              <table className="response-table">
                <thead>
                  <tr>
                    <th>#</th><th>응답자</th><th>이메일</th><th>부서</th><th>제출일시</th>
                    {questions.map((q, qi) => <th key={qi}>Q{qi + 1}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {responses.map((r, ri) => {
                    const rsp = r.respondent || {};
                    return (
                      <tr key={ri}>
                        <td>{ri + 1}</td>
                        <td>{rsp.name || '익명'}</td>
                        <td>{rsp.email || '-'}</td>
                        <td>{rsp.department || '-'}</td>
                        <td>{new Date(r.submittedAt).toLocaleString('ko-KR')}</td>
                        {questions.map((q, qi) => {
                          const a = r.answers[qi];
                          return <td key={qi}>{Array.isArray(a) ? a.join(', ') : (a || '-')}</td>;
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function QuestionReport({ q, qi, responses }) {
  const typeLabel = { radio: '객관식(단일)', checkbox: '객관식(복수)', scale: '척도', text: '주관식' }[q.type];

  if (q.type === 'radio' || q.type === 'checkbox') {
    const counts = {};
    q.options.forEach(o => { counts[o] = 0; });
    responses.forEach(r => {
      const a = r.answers[qi];
      if (Array.isArray(a)) a.forEach(v => { counts[v] = (counts[v] || 0) + 1; });
      else if (a) counts[a] = (counts[a] || 0) + 1;
    });

    const chartType = q.options.length > 5 ? 'bar' : 'doughnut';

    return (
      <div className="card">
        <h3>Q{qi + 1}. {q.title}</h3>
        <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 14 }}>{typeLabel} &middot; 응답 {responses.length}건</p>
        <MediaDisplay mediaArr={q.media} />
        <div style={{ marginBottom: 14 }}>
          {Object.entries(counts).map(([l, c], i) => {
            const p = Math.round(c / responses.length * 100);
            return (
              <div key={l} style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 3 }}>
                  <span>{l}</span><span>{c}명 ({p}%)</span>
                </div>
                <div className="progress-bar">
                  <div className="fill" style={{ width: `${p}%`, background: COLORS[i % COLORS.length] }}>
                    {p > 10 ? p + '%' : ''}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="chart-container">
          {chartType === 'doughnut' ? (
            <Doughnut
              data={{
                labels: Object.keys(counts),
                datasets: [{ data: Object.values(counts), backgroundColor: COLORS.slice(0, Object.keys(counts).length) }],
              }}
              options={{ responsive: true, plugins: { legend: { position: 'bottom' } } }}
            />
          ) : (
            <Bar
              data={{
                labels: Object.keys(counts),
                datasets: [{ data: Object.values(counts), backgroundColor: COLORS.slice(0, Object.keys(counts).length) }],
              }}
              options={{ responsive: true, plugins: { legend: { display: false } } }}
            />
          )}
        </div>
      </div>
    );
  }

  if (q.type === 'scale') {
    const vals = responses.map(r => +r.answers[qi]).filter(v => !isNaN(v));
    const avg = vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2) : '-';
    const dist = {};
    for (let i = q.scaleMin; i <= q.scaleMax; i++) dist[i] = 0;
    vals.forEach(v => { dist[v] = (dist[v] || 0) + 1; });

    return (
      <div className="card">
        <h3>Q{qi + 1}. {q.title}</h3>
        <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 14 }}>{typeLabel} &middot; 응답 {responses.length}건</p>
        <MediaDisplay mediaArr={q.media} />
        <div className="stat-summary">
          <div className="stat-box"><div className="num">{avg}</div><div className="label">평균</div></div>
          <div className="stat-box"><div className="num">{vals.length ? getMedian(vals) : '-'}</div><div className="label">중앙값</div></div>
          <div className="stat-box"><div className="num">{vals.length ? getMode(vals) : '-'}</div><div className="label">최빈값</div></div>
          <div className="stat-box"><div className="num">{vals.length > 1 ? getStdDev(vals).toFixed(2) : '-'}</div><div className="label">표준편차</div></div>
        </div>
        {Object.entries(dist).map(([l, c]) => {
          const p = vals.length ? Math.round(c / vals.length * 100) : 0;
          return (
            <div key={l} style={{ marginBottom: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 3 }}>
                <span>{l}점</span><span>{c}명 ({p}%)</span>
              </div>
              <div className="progress-bar">
                <div className="fill" style={{ width: `${p}%`, background: '#4361ee' }}>
                  {p > 10 ? p + '%' : ''}
                </div>
              </div>
            </div>
          );
        })}
        <div className="chart-container">
          <Bar
            data={{
              labels: Object.keys(dist).map(k => k + '점'),
              datasets: [{ label: '응답수', data: Object.values(dist), backgroundColor: '#4361ee' }],
            }}
            options={{
              responsive: true,
              plugins: { legend: { display: false } },
              scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
            }}
          />
        </div>
      </div>
    );
  }

  if (q.type === 'text') {
    // Keyword extraction
    const words = {};
    responses.forEach(r => {
      (r.answers[qi] || '').split(/[\s,.\-;:!?]+/).filter(w => w.length > 1).forEach(w => {
        words[w.toLowerCase()] = (words[w.toLowerCase()] || 0) + 1;
      });
    });
    const topWords = Object.entries(words).sort((a, b) => b[1] - a[1]).slice(0, 10);

    return (
      <div className="card">
        <h3>Q{qi + 1}. {q.title}</h3>
        <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 14 }}>{typeLabel} &middot; 응답 {responses.length}건</p>
        <MediaDisplay mediaArr={q.media} />
        <table className="response-table">
          <thead><tr><th>#</th><th>응답</th><th>제출일시</th></tr></thead>
          <tbody>
            {responses.map((r, ri) => (
              <tr key={ri}>
                <td>{ri + 1}</td>
                <td>{r.answers[qi] || '(미응답)'}</td>
                <td>{new Date(r.submittedAt).toLocaleString('ko-KR')}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {topWords.length > 0 && (
          <>
            <h3 style={{ marginTop: 16 }}>주요 키워드 (상위 10개)</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              {topWords.map(([w, c]) => (
                <span key={w} style={{ fontSize: 14 + Math.min(c * 3, 18), padding: '4px 12px', background: '#f0f2f5', borderRadius: 16 }}>
                  {w} <small style={{ color: '#6b7280' }}>({c})</small>
                </span>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  return null;
}
