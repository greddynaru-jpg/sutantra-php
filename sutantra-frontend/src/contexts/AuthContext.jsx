import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getCurrentUser, loginUser, logoutUser, setToken, getToken } from "../services/api";

// Role → landing route after login/registration.
export function roleHome(role) {
  switch (role) {
    case "SUPER_ADMIN":
      return "/super-admin";
    case "ADMIN":
      return "/admin";
    default:
      return "/products";
  }
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    getCurrentUser()
      .then((profile) => setUser(profile))
      .catch((error) => {
        // Expired/revoked token: clear it and treat as signed out.
        if (error.status === 401) {
          setToken("");
          setUser(null);
        } else {
          setAuthError(error.message);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(identifier, password) {
    const result = await loginUser(identifier, password);
    setToken(result.token);
    setUser(result.user);
    setAuthError("");
    return result.user;
  }

  async function logout() {
    try {
      await logoutUser();
    } catch {
      // Even if the server call fails, clear the local session.
    } finally {
      setToken("");
      setUser(null);
    }
  }

  function updateUser(nextUser) {
    setUser(nextUser);
  }

  const value = useMemo(
    () => ({ user, loading, authError, login, logout, updateUser }),
    [user, loading, authError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }
  return context;
}