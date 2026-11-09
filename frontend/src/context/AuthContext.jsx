import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { TOKEN_KEY } from '../api/client.js';
import * as authApi from '../api/auth.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }, []);

  const saveSession = useCallback((token, u) => {
    localStorage.setItem(TOKEN_KEY, token);
    setUser(u);
  }, []);

  // restore the session from a saved token on first load
  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) return;
    authApi.fetchMe().then(setUser).catch(logout);
  }, [logout]);

  const login = async (username, password) => {
    const data = await authApi.login(username, password);
    saveSession(data.token, data.user);
  };

  const register = async (username, password) => {
    const data = await authApi.register(username, password);
    saveSession(data.token, data.user);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
