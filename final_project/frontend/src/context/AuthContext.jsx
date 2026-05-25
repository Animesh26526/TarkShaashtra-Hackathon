import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Client, Account, ID, OAuthProvider } from 'appwrite';

const AuthContext = createContext();

const endpoint = import.meta.env.VITE_APPWRITE_ENDPOINT;
const project = import.meta.env.VITE_APPWRITE_PROJECT_ID;

if (!endpoint || !project) {
  console.error('[Resolvo] Appwrite configuration missing! Check your .env file.');
}

const client = new Client();
if (endpoint) client.setEndpoint(endpoint);
if (project) client.setProject(project);

const account = new Account(client);

// Valid roles — single source of truth for the app
export const VALID_ROLES = [
  'Customer Support Executive',
  'Quality Assurance Team',
  'Operations Manager',
];

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionToken, setSessionToken] = useState(null);

  const getJWT = useCallback(async () => {
    try {
      const response = await account.createJWT();
      return response.jwt;
    } catch {
      return null;
    }
  }, []);

  const getAuthHeaders = useCallback(async () => {
    const jwt = await getJWT();
    return {
      'Content-Type': 'application/json',
      ...(jwt ? { 'Authorization': `Bearer ${jwt}` } : {}),
    };
  }, [getJWT]);

  const checkSession = useCallback(async () => {
    try {
      const currentUser = await account.get();
      setUser(currentUser);
      // Fetch a real JWT for backend API verification
      try {
        const jwt = await getJWT();
        setSessionToken(jwt);
      } catch {
        setSessionToken(null);
      }
    } catch {
      setUser(null);
      setSessionToken(null);
    } finally {
      setIsLoading(false);
    }
  }, [getJWT]);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  /**
   * Login with email + password + selectedRole.
   * SECURITY: After creating the session, we fetch the user's prefs from Appwrite
   * and compare prefs.role against selectedRole. If they don't match, we
   * immediately delete the session and throw a ROLE_MISMATCH error.
   */
  const login = async (email, password, selectedRole) => {
    if (!selectedRole || !VALID_ROLES.includes(selectedRole)) {
      throw new Error('INVALID_ROLE');
    }

    // Create the session
    let session;
    try {
      session = await account.createEmailPasswordSession(email, password);
    } catch (err) {
      // Re-throw Appwrite errors (wrong password, user not found, etc.)
      throw err;
    }

    // Fetch the full user with prefs
    let currentUser;
    try {
      currentUser = await account.get();
    } catch (err) {
      // Can't fetch user — abort
      try { await account.deleteSession('current'); } catch {}
      throw new Error('Failed to fetch user profile after login.');
    }

    const storedRole = currentUser?.prefs?.role;

    // CRITICAL SECURITY CHECK: Role must match what is stored in Appwrite
    if (!storedRole) {
      // Account exists but has no role yet (e.g. Google OAuth without profile)
      setUser(currentUser);
      return { user: currentUser, needsProfile: true };
    }

    if (storedRole !== selectedRole) {
      // ROLE MISMATCH — destroy the session immediately
      try { await account.deleteSession('current'); } catch {}
      setUser(null);
      setSessionToken(null);
      const error = new Error('ROLE_MISMATCH');
      error.storedRole = storedRole;
      throw error;
    }

    // All checks passed
    try {
      const jwt = await getJWT();
      setSessionToken(jwt);
    } catch {}

    setUser(currentUser);
    return { user: currentUser, needsProfile: false };
  };

  /**
   * Signup with name, email, password, role, employeeId.
   * SECURITY:
   * - Role is validated against VALID_ROLES.
   * - role_locked: true is stored in prefs, preventing future role changes.
   * - No email verification bypass — we redirect straight to dashboard
   *   since SMTP is not configured. A banner informs the user.
   */
  const signup = async ({ name, email, password, role, employeeId }) => {
    if (!role || !VALID_ROLES.includes(role)) {
      throw new Error('Invalid role selected.');
    }
    if (!employeeId?.trim()) {
      throw new Error('Employee ID is required.');
    }
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters.');
    }

    // 1. Create Appwrite account
    await account.create(ID.unique(), email, password, name);

    // 2. Create session immediately
    await account.createEmailPasswordSession(email, password);

    // 3. Store role + employee ID + role_locked flag in prefs
    //    role_locked: true ensures the role can NEVER be changed by completeProfile
    await account.updatePrefs({
      role,
      employee_id: employeeId.trim(),
      role_locked: true,
    });

    // 4. Fetch final user state
    const currentUser = await account.get();
    setUser(currentUser);

    // 5. Store session token
    try {
      const jwt = await getJWT();
      setSessionToken(jwt);
    } catch {}

    return currentUser;
  };

  /**
   * Google OAuth login — redirects to Appwrite OAuth flow.
   * After redirect, user lands on /complete-profile if role not set yet.
   */
  const loginWithGoogle = () => {
    const successUrl = `${window.location.origin}/complete-profile`;
    const failureUrl = `${window.location.origin}/login`;
    account.createOAuth2Session(OAuthProvider.Google, successUrl, failureUrl);
  };

  /**
   * Complete profile for Google OAuth users who don't have a role yet.
   * SECURITY: Checks role_locked. If true, throws — role cannot be changed.
   */
  const completeProfile = async ({ role, employeeId }) => {
    if (!role || !VALID_ROLES.includes(role)) {
      throw new Error('Invalid role selected.');
    }

    // Check if role is already locked
    const currentUser = await account.get();
    if (currentUser?.prefs?.role_locked) {
      throw new Error('ROLE_ALREADY_LOCKED');
    }

    await account.updatePrefs({
      role,
      employee_id: employeeId?.trim() || '',
      role_locked: true,
    });

    const updatedUser = await account.get();
    setUser(updatedUser);
    return updatedUser;
  };

  /**
   * Initiate Appwrite password recovery.
   */
  const sendPasswordRecovery = async (email) => {
    const recoveryUrl = `${window.location.origin}/reset-password`;
    await account.createRecovery(email, recoveryUrl);
  };

  /**
   * Complete password recovery using userId + secret from email link.
   */
  const confirmPasswordRecovery = async (userId, secret, newPassword) => {
    await account.updateRecovery(userId, secret, newPassword);
  };

  const logout = async () => {
    try {
      await account.deleteSession('current');
    } catch {}
    setUser(null);
    setSessionToken(null);
    // Clear any cached data but NOT role — role is derived from Appwrite
    localStorage.removeItem('dark_mode');
  };

  // Read-only computed values
  const isAuthenticated = !!user;

  // Email verification status (true = verified, false = not yet)
  const isVerified = user?.emailVerification === true;

  // Has profile = has a role stored in Appwrite prefs
  const hasProfile = !!(user?.prefs?.role);

  // Role is read-only — derived from Appwrite prefs. NEVER from localStorage.
  const userRole = user?.prefs?.role || null;

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      isAuthenticated,
      isVerified,
      hasProfile,
      userRole,        // Read-only. Derived from Appwrite prefs.
      sessionToken,    // For backend API calls
      getJWT,
      getAuthHeaders,
      login,
      signup,
      loginWithGoogle,
      completeProfile,
      sendPasswordRecovery,
      confirmPasswordRecovery,
      logout,
      checkSession,
      account,
      client,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
