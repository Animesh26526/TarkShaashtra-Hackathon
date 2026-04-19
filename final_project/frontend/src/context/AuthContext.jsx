import React, { createContext, useContext, useState, useEffect } from 'react';
import { Client, Account, ID, OAuthProvider } from 'appwrite';

const AuthContext = createContext();

const client = new Client()
  .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
  .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID);

const account = new Account(client);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const currentUser = await account.get();
      setUser(currentUser);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email, password) => {
    await account.createEmailPasswordSession(email, password);
    const currentUser = await account.get();

    if (!currentUser.emailVerification) {
      // Send verification email and block
      const verifyUrl = `${window.location.origin}/verify-email`;
      try { await account.createVerification(verifyUrl); } catch {}
      await account.deleteSession('current');
      throw new Error('EMAIL_NOT_VERIFIED');
    }

    setUser(currentUser);
    return currentUser;
  };

  const signup = async ({ name, email, password, role, employeeId }) => {
    // 1. Create account
    await account.create(ID.unique(), email, password, name);

    // 2. Create session
    await account.createEmailPasswordSession(email, password);

    // 3. Save role & employee ID to prefs
    await account.updatePrefs({ role, employee_id: employeeId });

    // 4. Send verification email
    const verifyUrl = `${window.location.origin}/verify-email`;
    await account.createVerification(verifyUrl);

    // 5. Delete session — user must verify first
    await account.deleteSession('current');
  };

  const loginWithGoogle = () => {
    const successUrl = `${window.location.origin}/complete-profile`;
    const failureUrl = `${window.location.origin}/login`;
    account.createOAuth2Session(OAuthProvider.Google, successUrl, failureUrl);
  };

  const completeProfile = async ({ role, employeeId }) => {
    await account.updatePrefs({ role, employee_id: employeeId });
    const currentUser = await account.get();
    setUser(currentUser);
    return currentUser;
  };

  const logout = async () => {
    try {
      await account.deleteSession('current');
    } catch {}
    setUser(null);
    localStorage.removeItem('resolvo_role');
    localStorage.removeItem('dark_mode');
  };

  const isAuthenticated = !!user;
  const isVerified = user?.emailVerification === true;
  const hasProfile = !!(user?.prefs?.role);

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      isAuthenticated,
      isVerified,
      hasProfile,
      login,
      signup,
      loginWithGoogle,
      completeProfile,
      logout,
      checkSession,
      account,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
