import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import * as api from "../api";
import {
  clearGuestFavoriteIds,
  loadGuestFavoriteIds,
} from "../utils/favoritesStorage";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const token = api.getToken();
    if (!token) {
      setUser(null);
      return null;
    }
    try {
      const me = await api.fetchMe();
      setUser(me);
      return me;
    } catch {
      api.setToken(null);
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    refreshUser().finally(() => setLoading(false));
  }, [refreshUser]);

  const login = useCallback(
    async (email, password) => {
      const data = await api.loginUser({ email, password });
      api.setToken(data.token);
      localStorage.removeItem("lokalmatch_fav_ids");
      const guestIds = loadGuestFavoriteIds();
      if (guestIds.length) {
        await api.mergeFavorites(guestIds);
        clearGuestFavoriteIds();
      }
      return refreshUser();
    },
    [refreshUser]
  );

  const register = useCallback(
    async (payload) => {
      const data = await api.registerUser(payload);
      api.setToken(data.token);
      localStorage.removeItem("lokalmatch_fav_ids");
      const guestIds = loadGuestFavoriteIds();
      if (guestIds.length) {
        await api.mergeFavorites(guestIds);
        clearGuestFavoriteIds();
      }
      return refreshUser();
    },
    [refreshUser]
  );

  const logout = useCallback(() => {
    api.setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, logout, refreshUser }),
    [user, loading, login, register, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
