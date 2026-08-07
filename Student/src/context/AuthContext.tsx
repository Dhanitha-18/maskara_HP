import React, { createContext, useContext, useState, useEffect } from 'react';

interface AuthContextType {
  isLoggedIn: boolean;
  studentUsn: string | null;
  studentAccountId: string | null;
  studentName: string | null;
  studentPhone: string | null;
  token: string | null;
  setStudentName: (name: string) => void;
  login: (usn: string, name?: string, phone?: string, token?: string, studentAccountId?: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [studentUsn, setStudentUsn] = useState<string | null>(null);
  const [studentAccountId, setStudentAccountId] = useState<string | null>(null);
  const [studentName, setStudentName] = useState<string | null>(null);
  const [studentPhone, setStudentPhone] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // Use sessionStorage only — clears when the tab/window is closed, preventing auto-login on fresh link opens
    const savedUsn = sessionStorage.getItem('student_usn');
    const savedAccountId = sessionStorage.getItem('student_account_id');
    const savedName = sessionStorage.getItem('student_name');
    const savedPhone = sessionStorage.getItem('student_phone');
    const savedToken = sessionStorage.getItem('student_token');

    if (savedToken && (savedUsn || savedName)) {
      setStudentUsn(savedUsn);
      setStudentAccountId(savedAccountId);
      setStudentName(savedName);
      setStudentPhone(savedPhone);
      setToken(savedToken);
      setIsLoggedIn(true);
    } else {
      setIsLoggedIn(false);
    }
  }, []);

  const login = (usn: string, name?: string, phone?: string, authToken?: string, accountId?: string) => {
    const normalizedUsn = usn ? usn.trim().toUpperCase() : `STD-${Date.now()}`;
    setStudentUsn(normalizedUsn);
    setIsLoggedIn(true);
    // Use sessionStorage only — data persists only for the current browser tab/session
    sessionStorage.setItem('student_usn', normalizedUsn);

    if (accountId) {
      setStudentAccountId(accountId);
      sessionStorage.setItem('student_account_id', accountId);
    }
    if (name) {
      setStudentName(name);
      sessionStorage.setItem('student_name', name);
    }
    if (phone) {
      setStudentPhone(phone);
      sessionStorage.setItem('student_phone', phone);
    }
    if (authToken) {
      setToken(authToken);
      sessionStorage.setItem('student_token', authToken);
    }
  };

  const logout = () => {
    setIsLoggedIn(false);
    setStudentUsn(null);
    setStudentAccountId(null);
    setStudentName(null);
    setStudentPhone(null);
    setToken(null);
    sessionStorage.removeItem('student_usn');
    sessionStorage.removeItem('student_account_id');
    sessionStorage.removeItem('student_name');
    sessionStorage.removeItem('student_phone');
    sessionStorage.removeItem('student_token');
    // Also clear legacy localStorage keys in case any were set before
    localStorage.removeItem('student_usn');
    localStorage.removeItem('student_account_id');
    localStorage.removeItem('student_name');
    localStorage.removeItem('student_phone');
    localStorage.removeItem('student_token');
    localStorage.removeItem('cached_application_state');
  };

  const updateStudentName = (name: string) => {
    setStudentName(name);
    localStorage.setItem('student_name', name);
  };

  return (
    <AuthContext.Provider value={{
      isLoggedIn,
      studentUsn,
      studentAccountId,
      studentName,
      studentPhone,
      token,
      setStudentName: updateStudentName,
      login,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
