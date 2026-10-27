import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('user');
      return (saved && saved !== 'undefined' && saved !== 'null') ? JSON.parse(saved) : null;
    } catch (err) {
      console.error('Error parsing stored user:', err);
      localStorage.removeItem('user');
      return null;
    }
  });

  // Agar URL me ?ssoToken hai, to jab tak wo process na ho jaye, Routes ko
  // render hi mat karo — warna ProtectedRoute "user abhi null hai" dekh ke
  // turant /login pe bhej dega, SSO fetch complete hone se PEHLE hi
  // (ye race condition thi jiski wajah se kabhi Admin sahi jata tha,
  // kabhi Associate galat jagah chala jata tha)
  const [ssoLoading, setSsoLoading] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.has('ssoToken');
  });

  // ---------- SSO: agar website (public-website) se token aaya hai URL me, use pick karo ----------
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ssoToken = params.get('ssoToken');
    if (ssoToken) {
      (async () => {
        try {
          localStorage.setItem('token', ssoToken);
          const res = await api.get('/auth/me');
          localStorage.setItem('user', JSON.stringify(res.data.user));
          setUser(res.data.user);

          // Redirect to the correct role-based dashboard
          const role = (res.data.user.role || '').toLowerCase();
          const redirectMap = {
            admin: '/',
            associate: '/associate',
            client: '/client',
            accounts: '/accounts',
          };
          // Prefer the current path if it matches the user's panel (e.g. /accounts?ssoToken=...)
          const currentPath = window.location.pathname;
          const expectedPath = redirectMap[role] || '/login';
          const dashboard = currentPath.startsWith(expectedPath) && currentPath !== '/login'
            ? currentPath
            : expectedPath;

          // Clean URL and redirect
          params.delete('ssoToken');
          window.history.replaceState({}, '', dashboard);
        } catch (err) {
          localStorage.removeItem('token');
          window.history.replaceState({}, '', '/login');
        } finally {
          setSsoLoading(false);
        }
      })();
    }
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', res.data.token);
    localStorage.setItem('user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  // Jab tak SSO process ho raha hai, ek simple loading screen dikhao —
  // Routes/ProtectedRoute ko render hi mat hone do
  if (ssoLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'sans-serif', color: '#1E3A8A' }}>
        Logging you in...
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading: false }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);