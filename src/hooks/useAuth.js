import { useState, useEffect, useCallback, createContext, useContext, createElement } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = sessionStorage.getItem('portal_user');
    if (saved) {
      try { return JSON.parse(saved); } catch { /* ignore */ }
    }
    return null;
  });

  useEffect(() => {
    fetch('/api/portal/me', { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        if (data.authenticated && data.user) {
          const user = {
            name: data.user.displayName || '',
            email: data.user.email || '',
            department: data.user.department || '',
            role: data.user.role || 'user',
          };
          sessionStorage.setItem('portal_user', JSON.stringify(user));
          setCurrentUser(user);
        } else {
          sessionStorage.removeItem('portal_user');
          setCurrentUser(null);
        }
      })
      .catch(() => {});
  }, []);

  const login = useCallback(() => {
    window.location.href = '/';
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/portal/logout', { method: 'POST', credentials: 'include' });
    } catch { /* ignore */ }
    sessionStorage.removeItem('portal_user');
    setCurrentUser(null);
    window.location.href = '/';
  }, []);

  return createElement(AuthContext.Provider, { value: { currentUser, login, logout } }, children);
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
