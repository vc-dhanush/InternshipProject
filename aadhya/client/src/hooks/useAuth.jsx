import { createContext, useContext, useEffect, useMemo, useState } from "react";
import api, { setUnauthorizedHandler } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loginTime, setLoginTime] = useState(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    try {
      const { data: me } = await api.get("/auth/me");
      setUser(me.user);
      setLoginTime(me.loginTime);
      try {
        const { data: st } = await api.get("/settings");
        setSettings(st.settings);
      } catch {
        setSettings(null);
      }
    } catch {
      setUser(null);
      setSettings(null);
      setLoginTime(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    const onPageShow = (event) => {
      if (event.persisted) refresh();
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
      setSettings(null);
      setLoginTime(null);
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      settings,
      loginTime,
      loading,
      authenticated: Boolean(user),
      setUser,
      setSettings,
      setLoginTime,
      refresh,
      async applyAuth(payload) {
        setUser(payload.user);
        setLoginTime(payload.loginTime);
        setLoading(false);
        try {
          const { data } = await api.get("/settings");
          setSettings(data.settings);
        } catch {
          setSettings(null);
        }
      },
      async logout() {
        try {
          await api.post("/auth/logout");
        } catch {
          /* cookie may already be gone */
        }
        setUser(null);
        setSettings(null);
        setLoginTime(null);
      },
    }),
    [user, settings, loginTime, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
