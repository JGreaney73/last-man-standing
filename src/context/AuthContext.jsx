import { createContext, useEffect, useState } from "react";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return undefined;
    }

    let mounted = true;

    const loadProfile = async (currentSession) => {
      if (!currentSession?.user) {
        if (mounted) setProfile(null);
        return;
      }

      const { data, error: profileError } = await supabase
        .from("profiles")
        .select("id, username, display_name, role, competition_status")
        .eq("id", currentSession.user.id)
        .maybeSingle();

      if (mounted) {
        setProfile(data ?? null);
        if (profileError) setError(profileError.message);
      }
    };

    supabase.auth.getSession().then(async ({ data, error: sessionError }) => {
      if (!mounted) return;
      if (sessionError) setError(sessionError.message);
      setSession(data.session);
      await loadProfile(data.session);
      if (mounted) setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, currentSession) => {
        if (!mounted) return;
        setSession(currentSession);
        await loadProfile(currentSession);
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email, password) => {
    if (!supabase) return { error: new Error("Supabase is not configured.") };

    setError("");
    const result = await supabase.auth.signInWithPassword({ email, password });
    if (result.error) setError(result.error.message);
    return result;
  };

  const sendPasswordReset = async (email) => {
    if (!supabase) return { error: new Error("Supabase is not configured.") };

    // Recovery links return to this route with a temporary Supabase session.
    return supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
  };

  const changePassword = async (currentPassword, newPassword) => {
    if (!supabase || !session?.user?.email) {
      return { error: new Error("Your account session is unavailable. Sign in again.") };
    }

    const { error: verificationError } = await supabase.auth.signInWithPassword({
      email: session.user.email,
      password: currentPassword,
    });
    if (verificationError) {
      return { error: new Error("The current password is incorrect.") };
    }

    return supabase.auth.updateUser({ password: newPassword });
  };

  const updatePassword = async (newPassword) => {
    if (!supabase) return { error: new Error("Supabase is not configured.") };
    return supabase.auth.updateUser({ password: newPassword });
  };

  const signOut = async () => {
    if (!supabase) return;
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) setError(signOutError.message);
  };

  return (
    <AuthContext.Provider
      value={{
        user: session?.user ?? null,
        session,
        profile,
        isAdmin: profile?.role === "admin",
        loading,
        error,
        configured: isSupabaseConfigured,
        signIn,
        sendPasswordReset,
        changePassword,
        updatePassword,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export { AuthContext };
