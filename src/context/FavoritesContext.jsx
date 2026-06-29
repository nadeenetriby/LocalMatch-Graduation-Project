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
  loadGuestFavoriteIds,
  saveGuestFavoriteIds,
} from "../utils/favoritesStorage";
import { useAuth } from "./AuthContext";

const FavoritesContext = createContext(null);

export function FavoritesProvider({ children }) {
  const { user, loading: authLoading } = useAuth();
  const [ids, setIds] = useState([]);

  useEffect(() => {
    if (authLoading) return;
    if (user) {
      setIds(user.favoriteSourceIds || []);
    } else {
      setIds(loadGuestFavoriteIds());
    }
  }, [user, authLoading]);

  const favoritedSet = useMemo(() => new Set(ids), [ids]);

  const isFavorite = useCallback(
    (sourceId) => favoritedSet.has(Number(sourceId)),
    [favoritedSet]
  );

  const toggleFavorite = useCallback(
    async (sourceId) => {
      const sid = Number(sourceId);
      if (!sid) return;
      if (user) {
        const res = await api.toggleFavorite(sid);
        setIds(res.favoriteSourceIds || []);
      } else {
        const next = favoritedSet.has(sid)
          ? ids.filter((x) => x !== sid)
          : [...ids, sid];
        setIds(next);
        saveGuestFavoriteIds(next);
      }
    },
    [user, ids, favoritedSet]
  );

  const value = useMemo(
    () => ({ favoriteIds: ids, isFavorite, toggleFavorite }),
    [ids, isFavorite, toggleFavorite]
  );

  return (
    <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) {
    throw new Error("useFavorites must be used within FavoritesProvider");
  }
  return ctx;
}
