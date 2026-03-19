import { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
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
import { esc, getMedian } from '../lib/utils';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

const CA = '#4361ee';
const CB = '#e63946';

export default function SurveyCompare() {
  const [surveys, setSurveys] = useState([]);
  const [allResponses, setAllResponses] = useState({});
  const [idA, setIdA] = useState('');
  const [idB, setIdB] = useState('');
  const [compareResult, setCompareResult] = useState(null);

  useEffect(() => {
    async function load() {
      const data = await loadData();
      const withRes = data.surveys.filter(s => (data.responses[s.id] || []).length > 0);
      setSurveys(withRes);
      setAllResponses(data.responses);
    }
    load();
  }, []);

  const runCompare = () => {
    if (!idA || !idB) { alert('두 설문을 모두 선택해 주세요.'); return; }
    const sA = surveys.find(x => x.id === idA);
    const sB = surveys.find(x => x.id === idB);
    if (!sA || !sB) return;
    const resA = allResponses[idA] || [];
    const resB = allResponses[idB] || [];
    setCompareResult({ sA, sB, resA, resB });
  };

  const withRes = surveys;

  return (
    <div className="page active">
      <div className="card no-print">
        <h2>설문 결과 비교</h2>
        <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 16 }}>두 설문을 선택하여 결과를 나란히 비교합니다.</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label>A 설문 (기준)</label>
            <select value={idA} onChange={(e) => setIdA(e.target.value)}>
              <option value="">-- 선택 --</option>
              {withRes.map(s => (
                <option key={s.id} value={s.id}>
                  {s.title} ({(allResponses[s.id] || []).length}건, {s.createdAt})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>B 설문 (비교 대상)</label>
            <select value={idB} onChange={(e) => setIdB(e.target.value)}>
              <option value="">-- 선택 --</option>
              {withRes.map(s => (
                <option key={s.id} value={s.id}>
                  {s.title} ({(allResponses[s.id] || []).length}건, {s.createdAt})
                </option>
              ))}
            </select>
          </div>
        </div>
        <div style={{ marginTop: 16, textAlign: 'right' }}>
          <button className="btn btn-outline btn-sm" onClick={() => window.print()} style={{ marginRight: 8 }}>인쇄 / PDF</button>
          <button className="btn btn-primary" onClick={runCompare}>비교 실행</button>
        </div>
      </div>

      {compareResult && <CompareContent {...compareResult} />}
    </div>
  );
}

function CompareContent({ sA, sB, resA, resB }) {
  const maxQ = Math.max(sA.questions.length, sB.questions.length);

  return (
    <>
      {/* Summary */}
      <div className="card">
        <h3>응답 요약 비교</h3>
        <div className="compare-legend">
          <span className="leg-a">A: {sA.title}</span>
          <span className="leg-b">B: {sB.title}</span>
        </div>
        <div className="compare-grid">
          <div className="compare-col">
            <h4>{sA.title}</h4>
            <div className="stat-summary">
              <div className="stat-box"><div className="num">{resA.length}</div><div className="label">응답수</div></div>
              <div className="stat-box"><div className="num">{sA.questions.length}</div><div className="label">질문수</div></div>
            </div>
          </div>
          <div className="compare-col col-b">
            <h4>{sB.title}</h4>
            <div className="stat-summary">
              <div className="stat-box"><div className="num">{resB.length}</div><div className="label">응답수</div></div>
              <div className="stat-box"><div className="num">{sB.questions.length}</div><div className="label">질문수</div></div>
            </div>
          </div>
        </div>
      </div>

      {/* Per-question comparison */}
      {Array.from({ length: maxQ }, (_, qi) => {
        const qA = sA.questions[qi];
        const qB = sB.questions[qi];
        if (!qA && !qB) return null;
        const same = qA && qB && qA.type === qB.type;
        const titleA = qA ? qA.title : '(없음)';
        const titleB = qB ? qB.title : '(없음)';
        const displayTitle = qA && qB && qA.title === qB.title
          ? `Q${qi + 1}. ${titleA}`
          : `Q${qi + 1}. A: ${titleA} / B: ${titleB}`;

        return (
          <div className="card compare-row" key={qi}>
            <div className="compare-q-title">{displayTitle}</div>
            {same && qA.type === 'scale' ? (
              <ScaleCompare qi={qi} qA={qA} resA={resA} resB={resB} sA={sA} sB={sB} />
            ) : same && (qA.type === 'radio' || qA.type === 'checkbox') ? (
              <ChoiceCompare qi={qi} qA={qA} qB={qB} resA={resA} resB={resB} sA={sA} sB={sB} />
            ) : (
              <FallbackCompare qi={qi} qA={qA} qB={qB} resA={resA} resB={resB} />
            )}
          </div>
        );
      })}
    </>
  );
}

function ScaleCompare({ qi, qA, resA, resB, sA, sB }) {
  const vA = resA.map(r => +r.answers[qi]).filter(v => !isNaN(v));
  const vB = resB.map(r => +r.answers[qi]).filter(v => !isNaN(v));
  const avgA = vA.length ? vA.reduce((a, b) => a + b, 0) / vA.length : 0;
  const avgB = vB.length ? vB.reduce((a, b) => a + b, 0) / vB.length : 0;
  const diff = avgB - avgA;
  const dc = diff > 0.1 ? 'up' : diff < -0.1 ? 'down' : 'neutral';
  const ds = diff > 0 ? '+' : '';

  const dA = {};
  const dB = {};
  for (let i = (qA.scaleMin || 1); i <= (qA.scaleMax || 5); i++) { dA[i] = 0; dB[i] = 0; }
  vA.forEach(v => { dA[v] = (dA[v] || 0) + 1; });
  vB.forEach(v => { dB[v] = (dB[v] || 0) + 1; });

  return (
    <>
      <div className="compare-legend">
        <span className="leg-a">A</span>
        <span className="leg-b">B</span>
      </div>
      <div className="compare-grid">
        <div className="compare-col">
          <div className="stat-summary">
            <div className="stat-box"><div className="num">{avgA.toFixed(2)}</div><div className="label">평균</div></div>
            <div className="stat-box"><div className="num">{vA.length ? getMedian(vA) : '-'}</div><div className="label">중앙값</div></div>
          </div>
        </div>
        <div className="compare-col col-b">
          <div className="stat-summary">
            <div className="stat-box">
              <div className="num">{avgB.toFixed(2)}<span className={`delta ${dc}`}>{ds}{diff.toFixed(2)}</span></div>
              <div className="label">평균</div>
            </div>
            <div className="stat-box"><div className="num">{vB.length ? getMedian(vB) : '-'}</div><div className="label">중앙값</div></div>
          </div>
        </div>
      </div>
      <div style={{ maxWidth: 600, margin: '16px auto' }}>
        <Bar
          data={{
            labels: Object.keys(dA).map(k => k + '점'),
            datasets: [
              { label: 'A: ' + sA.title, data: Object.values(dA), backgroundColor: CA + 'bb' },
              { label: 'B: ' + sB.title, data: Object.values(dB), backgroundColor: CB + 'bb' },
            ],
          }}
          options={{
            responsive: true,
            plugins: { legend: { position: 'bottom' } },
            scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
          }}
        />
      </div>
    </>
  );
}

function ChoiceCompare({ qi, qA, qB, resA, resB, sA, sB }) {
  const allOpts = [...new Set([...(qA.options || []), ...(qB.options || [])])];
  const cA = {};
  const cB = {};
  allOpts.forEach(o => { cA[o] = 0; cB[o] = 0; });
  resA.forEach(r => {
    const a = r.answers[qi];
    if (Array.isArray(a)) a.forEach(v => { cA[v] = (cA[v] || 0) + 1; });
    else if (a) cA[a] = (cA[a] || 0) + 1;
  });
  resB.forEach(r => {
    const a = r.answers[qi];
    if (Array.isArray(a)) a.forEach(v => { cB[v] = (cB[v] || 0) + 1; });
    else if (a) cB[a] = (cB[a] || 0) + 1;
  });

  return (
    <>
      <div className="compare-legend">
        <span className="leg-a">A ({resA.length}건)</span>
        <span className="leg-b">B ({resB.length}건)</span>
      </div>
      {allOpts.map(opt => {
        const pA = resA.length ? Math.round(cA[opt] / resA.length * 100) : 0;
        const pB = resB.length ? Math.round(cB[opt] / resB.length * 100) : 0;
        const d = pB - pA;
        const dc = d > 0 ? 'up' : d < 0 ? 'down' : 'neutral';
        return (
          <div key={opt} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 3 }}>
              <span style={{ fontWeight: 600 }}>{opt}</span>
              <span>
                A:{pA}% / B:{pB}%
                <span className={`delta ${dc}`}>({d > 0 ? '+' : ''}{d}%p)</span>
              </span>
            </div>
            <div style={{ position: 'relative', height: 24, background: '#e5e7eb', borderRadius: 5, overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, height: '50%', width: `${pA}%`, background: CA, opacity: 0.75 }}></div>
              <div style={{ position: 'absolute', bottom: 0, left: 0, height: '50%', width: `${pB}%`, background: CB, opacity: 0.75 }}></div>
            </div>
          </div>
        );
      })}
      <div style={{ maxWidth: 600, margin: '16px auto' }}>
        <Bar
          data={{
            labels: allOpts,
            datasets: [
              { label: 'A', data: allOpts.map(o => resA.length ? Math.round(cA[o] / resA.length * 100) : 0), backgroundColor: CA + 'bb' },
              { label: 'B', data: allOpts.map(o => resB.length ? Math.round(cB[o] / resB.length * 100) : 0), backgroundColor: CB + 'bb' },
            ],
          }}
          options={{
            responsive: true,
            indexAxis: 'y',
            plugins: { legend: { position: 'bottom' } },
            scales: { x: { beginAtZero: true, max: 100, ticks: { callback: v => v + '%' } } },
          }}
        />
      </div>
    </>
  );
}

function FallbackCompare({ qi, qA, qB, resA, resB }) {
  return (
    <div className="compare-grid">
      {[{ q: qA, res: resA, label: 'A' }, { q: qB, res: resB, label: 'B' }].map(({ q, res, label }) => (
        <div key={label} className={`compare-col ${label === 'B' ? 'col-b' : ''}`}>
          {!q ? (
            <p style={{ color: '#9ca3af' }}>해당 질문 없음</p>
          ) : q.type === 'text' ? (
            <>
              <p style={{ fontSize: 13, color: '#6b7280' }}>주관식 {res.filter(r => r.answers[qi]).length}건</p>
              <div style={{ maxHeight: 200, overflowY: 'auto', fontSize: 13 }}>
                {res.map(r => r.answers[qi]).filter(a => a).slice(0, 10).map((a, i) => (
                  <div key={i} style={{ padding: '6px 0', borderBottom: '1px solid #eee' }}>{a}</div>
                ))}
              </div>
            </>
          ) : (
            <p style={{ color: '#9ca3af' }}>타입: {q.type}</p>
          )}
        </div>
      ))}
    </div>
  );
}
