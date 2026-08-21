import { createContext, useContext, useEffect, useMemo, useState } from "react";
import api from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loginTime, setLoginTime] = useState(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    const token = localStorage.getItem("aadhya_token");
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const [{ data: me }, { data: st }] = await Promise.all([
        api.get("/auth/me"),
        api.get("/settings"),
      ]);
      setUser(me.user);
      setLoginTime(me.loginTime);
      setSettings(st.settings);
    } catch {
      localStorage.removeItem("aadhya_token");
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const value = useMemo(
    () => ({
      user,
      settings,
      loginTime,
      loading,
      setUser,
      setSettings,
      setLoginTime,
      refresh,
      async applyAuth(payload) {
        localStorage.setItem("aadhya_token", payload.token);
        setUser(payload.user);
        setLoginTime(payload.loginTime);
        try {
          const { data } = await api.get("/settings");
          setSettings(data.settings);
        } catch {
          /* first login still ok */
        }
      },
      async logout() {
        try {
          await api.post("/auth/logout");
        } catch {
          /* ignore */
        }
        localStorage.removeItem("aadhya_token");
        setUser(null);
        setSettings(null);
      },
    }),
    [user, settings, loginTime, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
