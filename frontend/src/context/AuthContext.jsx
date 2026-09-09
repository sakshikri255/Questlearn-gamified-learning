import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(() => localStorage.getItem("quest_access_token") || null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Helper for authenticated API calls
  const authFetch = useCallback(
    async (url, options = {}) => {
      const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      };

      if (accessToken) {
        headers["Authorization"] = `Bearer ${accessToken}`;
      }

      const res = await fetch(url, {
        ...options,
        headers,
        credentials: "include", // send cookies
      });

      // If 401 and not already refreshing, try refreshing token
      if (res.status === 401 && !url.includes("/api/auth/refresh") && !url.includes("/api/auth/login")) {
        try {
          const refreshRes = await fetch("/api/auth/refresh", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
          });

          if (refreshRes.ok) {
            const refreshData = await refreshRes.json();
            if (refreshData.accessToken) {
              setAccessToken(refreshData.accessToken);
              localStorage.setItem("quest_access_token", refreshData.accessToken);
              if (refreshData.user) setUser(refreshData.user);

              // Retry original request with new token
              headers["Authorization"] = `Bearer ${refreshData.accessToken}`;
              return fetch(url, { ...options, headers, credentials: "include" });
            }
          } else {
            // Refresh failed, clear user
            setUser(null);
            setAccessToken(null);
            localStorage.removeItem("quest_access_token");
          }
        } catch (e) {
          console.error("Token refresh failed", e);
        }
      }

      return res;
    },
    [accessToken]
  );

  // Hydrate user on mount
  useEffect(() => {
    let isMounted = true;

    async function checkAuth() {
      try {
        const storedToken = localStorage.getItem("quest_access_token");
        const headers = { "Content-Type": "application/json" };
        if (storedToken) {
          headers["Authorization"] = `Bearer ${storedToken}`;
        }

        const res = await fetch("/api/auth/me", {
          method: "GET",
          headers,
          credentials: "include",
        });

        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.user) {
            setUser(data.user);
            if (storedToken) setAccessToken(storedToken);
          }
        } else if (res.status === 401) {
          // Attempt refresh via cookie
          const refreshRes = await fetch("/api/auth/refresh", {
            method: "POST",
            credentials: "include",
          });
          if (refreshRes.ok) {
            const refreshData = await refreshRes.json();
            if (isMounted) {
              setUser(refreshData.user);
              setAccessToken(refreshData.accessToken);
              localStorage.setItem("quest_access_token", refreshData.accessToken);
            }
          } else {
            if (isMounted) {
              setUser(null);
              setAccessToken(null);
              localStorage.removeItem("quest_access_token");
            }
          }
        }
      } catch (err) {
        console.error("Failed checking auth session:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  // 1. Sign Up
  const signup = async ({ name, email, password, confirmPassword }) => {
    setAuthError(null);
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, confirmPassword }),
      credentials: "include",
    });

    const data = await res.json();
    if (!res.ok) {
      const err = new Error(data.error || "Signup failed");
      err.fieldErrors = data.fieldErrors;
      throw err;
    }
    return data;
  };

  // 2. Verify Email OTP
  const verifyEmail = async ({ email, otp }) => {
    setAuthError(null);
    const res = await fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp }),
      credentials: "include",
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Verification failed");
    }

    if (data.accessToken) {
      setAccessToken(data.accessToken);
      localStorage.setItem("quest_access_token", data.accessToken);
    }
    if (data.user) {
      setUser(data.user);
    }
    return data;
  };

  // 3. Resend OTP
  const resendOtp = async (email) => {
    const res = await fetch("/api/auth/resend-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to resend code");
    return data;
  };

  // 4. Login
  const login = async ({ email, password, rememberMe }) => {
    setAuthError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, rememberMe }),
      credentials: "include",
    });

    const data = await res.json();
    if (!res.ok) {
      const err = new Error(data.error || "Login failed");
      err.requiresVerification = data.requiresVerification;
      err.email = data.email;
      err.devOtp = data.devOtp;
      err.fieldErrors = data.fieldErrors;
      throw err;
    }

    // Check if 2FA challenge is required
    if (data.requires2FA) {
      return data;
    }

    if (data.accessToken) {
      setAccessToken(data.accessToken);
      localStorage.setItem("quest_access_token", data.accessToken);
    }
    if (data.user) {
      setUser(data.user);
    }
    return data;
  };

  // 5. Verify 2FA
  const verify2FA = async ({ tempToken, otp }) => {
    const res = await fetch("/api/auth/verify-2fa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tempToken, otp }),
      credentials: "include",
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "2FA verification failed");

    if (data.accessToken) {
      setAccessToken(data.accessToken);
      localStorage.setItem("quest_access_token", data.accessToken);
    }
    if (data.user) {
      setUser(data.user);
    }
    return data;
  };

  // 6. Forgot Password
  const forgotPassword = async (email) => {
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to submit request");
    return data;
  };

  // 7. Reset Password
  const resetPassword = async ({ token, newPassword, confirmPassword }) => {
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, newPassword, confirmPassword }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to reset password");
    return data;
  };

  // 8. Social Login (Google / GitHub / Apple stubs)
  const socialLogin = async (provider) => {
    const res = await fetch("/api/auth/social-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider,
        name: `${provider.charAt(0).toUpperCase() + provider.slice(1)} Hero`,
        email: `${provider}_hero_${Date.now()}@questlearn.com`,
      }),
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Social login failed");

    if (data.accessToken) {
      setAccessToken(data.accessToken);
      localStorage.setItem("quest_access_token", data.accessToken);
    }
    if (data.user) {
      setUser(data.user);
    }
    return data;
  };

  // 9. Logout
  const logout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (e) {
      console.error("Logout error", e);
    } finally {
      setUser(null);
      setAccessToken(null);
      localStorage.removeItem("quest_access_token");
    }
  };

  // 10. Toggle 2FA
  const toggle2FA = async () => {
    const res = await authFetch("/api/auth/toggle-2fa", { method: "POST" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Could not toggle 2FA");
    setUser((prev) => (prev ? { ...prev, twoFactorEnabled: data.twoFactorEnabled } : null));
    return data;
  };

  // 11. Update Profile
  const updateProfile = async (profileData) => {
    const res = await authFetch("/api/auth/profile", {
      method: "PUT",
      body: JSON.stringify(profileData),
    });
    const data = await res.json();
    if (!res.ok) {
      const err = new Error(data.error || "Failed to update profile");
      err.fieldErrors = data.fieldErrors;
      throw err;
    }
    if (data.user) {
      setUser(data.user);
    }
    if (data.accessToken) {
      setAccessToken(data.accessToken);
      localStorage.setItem("quest_access_token", data.accessToken);
    }
    return data;
  };

  // 12. Switch Profile (instant demo switch)
  const switchProfile = async (profileId) => {
    const res = await fetch("/api/auth/switch-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileId }),
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Failed to switch profile");
    }
    if (data.accessToken) {
      setAccessToken(data.accessToken);
      localStorage.setItem("quest_access_token", data.accessToken);
    }
    if (data.user) {
      setUser(data.user);
    }
    return data;
  };

  // 13. Get Profiles list
  const getProfiles = async () => {
    const res = await fetch("/api/auth/profiles");
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to load profiles");
    return data.profiles || [];
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        loading,
        authError,
        isAuthenticated: !!user,
        signup,
        verifyEmail,
        resendOtp,
        login,
        verify2FA,
        forgotPassword,
        resetPassword,
        socialLogin,
        logout,
        toggle2FA,
        updateProfile,
        switchProfile,
        getProfiles,
        authFetch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
