import { Link } from 'react-router-dom';
import { getCatStyle } from '../config/categories';

export default function SurveyCard({ survey, responseCount, currentUser, onToggleClose, onDelete, onEdit }) {
  const s = survey;
  const catStyle = getCatStyle(s.category);

  const alreadyAnswered = currentUser && s._responses &&
    s._responses.some(r => r.respondent && r.respondent.email === currentUser.email);

  return (
    <div className="survey-card">
      <div>
        <h3>
          {s.title}{' '}
          {s.category && (
            <span
              className="tag-category"
              style={{ background: catStyle.bg, color: catStyle.color }}
            >
              {s.category}
            </span>
          )}{' '}
          {s.closed ? (
            <span className="tag tag-closed">마감</span>
          ) : (
            <span className="tag tag-open">진행중</span>
          )}{' '}
          {alreadyAnswered && (
            <span className="tag" style={{ background: '#e0e7ff', color: '#4361ee' }}>
              응답 완료
            </span>
          )}
        </h3>
        <div className="meta">
          {s.questions.length}개 질문 &middot; {responseCount}건 응답 &middot; {s.createdAt}
        </div>
      </div>
      <div className="actions">
        {!s.closed && (
          <Link to={`/take/${s.id}`}>
            <button className="btn btn-primary btn-sm">
              {alreadyAnswered ? '재응답' : '응답하기'}
            </button>
          </Link>
        )}
        <Link to={`/report/${s.id}`}>
          <button className="btn btn-success btn-sm">리포트</button>
        </Link>
        <button className="btn btn-outline btn-sm" onClick={() => onToggleClose(s.id)}>
          {s.closed ? '재개' : '마감'}
        </button>
        <button className="btn btn-outline btn-sm" onClick={() => onEdit(s.id)}>
          수정
        </button>
        <button className="btn btn-danger btn-sm" onClick={() => onDelete(s.id)}>
          삭제
        </button>
      </div>
    </div>
  );
}
