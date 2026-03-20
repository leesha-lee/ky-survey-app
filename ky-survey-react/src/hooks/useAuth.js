import { useState, useEffect, useCallback, createContext, useContext, createElement } from 'react';
import { PublicClientApplication } from '@azure/msal-browser';
import { msalConfig, loginRequest } from '../config/msal';

let msalInstance = null;
let msalReady = false;

const initPromise = (async () => {
  try {
    msalInstance = new PublicClientApplication(msalConfig);
    await msalInstance.initialize();
    msalReady = true;
  } catch (e) {
    console.warn('MSAL init failed:', e);
  }
})();

export { loginRequest };

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = sessionStorage.getItem('msal_user');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return null;
  });

  useEffect(() => {
    initPromise.then(() => {
      if (msalReady) trySilentLogin();
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchUserProfile(account) {
    try {
      const tokenResp = await msalInstance.acquireTokenSilent({ ...loginRequest, account });
      const resp = await fetch(
        'https://graph.microsoft.com/v1.0/me?$select=displayName,mail,userPrincipalName,department,jobTitle',
        { headers: { Authorization: 'Bearer ' + tokenResp.accessToken } }
      );
      if (!resp.ok) throw new Error('Graph API error: ' + resp.status);
      const profile = await resp.json();
      const user = {
        name: profile.displayName || account.name || '',
        email: profile.mail || profile.userPrincipalName || account.username || '',
        department: profile.department || profile.jobTitle || '',
      };
      sessionStorage.setItem('msal_user', JSON.stringify(user));
      setCurrentUser(user);
      return user;
    } catch (e) {
      console.error('Profile fetch failed', e);
      const user = {
        name: account.name || '',
        email: account.username || '',
        department: '',
      };
      sessionStorage.setItem('msal_user', JSON.stringify(user));
      setCurrentUser(user);
      return user;
    }
  }

  async function trySilentLogin() {
    if (!msalInstance) return;
    const accounts = msalInstance.getAllAccounts();
    if (accounts.length > 0) {
      try {
        await msalInstance.acquireTokenSilent({ ...loginRequest, account: accounts[0] });
        await fetchUserProfile(accounts[0]);
      } catch (e) {
        console.warn('Silent login failed', e);
      }
    }
  }

  const login = useCallback(async () => {
    await initPromise;
    if (!msalReady) {
      alert('Microsoft 로그인을 사용하려면 Azure AD Client ID를 설정해야 합니다.');
      return null;
    }
    try {
      const resp = await msalInstance.loginPopup(loginRequest);
      const user = await fetchUserProfile(resp.account);
      return user;
    } catch (e) {
      console.error('Login failed', e);
      if (e.errorCode !== 'user_cancelled') {
        alert('로그인에 실패했습니다: ' + e.message);
      }
      return null;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logout = useCallback(async () => {
    await initPromise;
    if (!msalReady) return;
    setCurrentUser(null);
    sessionStorage.removeItem('msal_user');
    try {
      await msalInstance.logoutPopup();
    } catch (e) {
      console.warn('Logout error', e);
    }
  }, []);

  return createElement(AuthContext.Provider, { value: { currentUser, login, logout, msalInstance } }, children);
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
