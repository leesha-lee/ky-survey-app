import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { isAdmin } from '../config/roles';

function MsIcon() {
  return (
    <svg viewBox="0 0 21 21" style={{ width: 18, height: 18 }}>
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  );
}

export default function Nav() {
  const location = useLocation();
  const { currentUser, login, logout } = useAuth();
  const path = location.pathname;

  const isActive = (target) => {
    if (target === '/' && (path === '/' || path === '')) return true;
    if (target !== '/' && path.startsWith(target)) return true;
    return false;
  };

  const initials = currentUser
    ? (currentUser.name || '?').split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase()
    : '';

  return (
    <nav>
      <h1>Survey App</h1>
      <Link to="/">
        <button className={isActive('/') && !isActive('/create') && !isActive('/compare') ? 'active' : ''}>
          설문 목록
        </button>
      </Link>
      {isAdmin(currentUser) && (
        <Link to="/create">
          <button className={isActive('/create') || isActive('/edit') ? 'active' : ''}>
            설문 만들기
          </button>
        </Link>
      )}
      {isAdmin(currentUser) && (
        <Link to="/compare">
          <button className={isActive('/compare') ? 'active' : ''}>
            결과 비교
          </button>
        </Link>
      )}
      <div className="auth-area">
        {currentUser ? (
          <>
            <div className="user-profile">
              <div className="user-avatar">{initials}</div>
              <div>
                <div className="user-name">{currentUser.name}</div>
                {currentUser.department && (
                  <div className="user-dept">{currentUser.department}</div>
                )}
                <div className="user-email">{currentUser.email}</div>
              </div>
            </div>
            <button className="btn-ms-logout" onClick={logout}>
              로그아웃
            </button>
          </>
        ) : (
          <button className="btn-ms-login" onClick={login}>
            <MsIcon />
            Microsoft 로그인
          </button>
        )}
      </div>
    </nav>
  );
}
