import React, { createContext, useContext, useState, useEffect } from 'react';

interface AuthContextType {
  isLoggedIn: boolean;
  studentUsn: string | null;
  studentName: string | null;
  studentPhone: string | null;
  setStudentName: (name: string) => void;
  login: (usn: string, name?: string, phone?: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [studentUsn, setStudentUsn] = useState<string | null>(null);
  const [studentName, setStudentName] = useState<string | null>(null);
  const [studentPhone, setStudentPhone] = useState<string | null>(null);

  // Restore session from localStorage on mount so page refresh preserves login session
  useEffect(() => {
    const savedUsn = localStorage.getItem('student_usn');
    const savedName = localStorage.getItem('student_name');
    const savedPhone = localStorage.getItem('student_phone');
    if (savedUsn || savedName) {
      setStudentUsn(savedUsn);
      setStudentName(savedName);
      setStudentPhone(savedPhone);
      setIsLoggedIn(true);
    }
  }, []);

  const login = (usn: string, name?: string, phone?: string) => {
    const normalizedUsn = usn ? usn.trim().toUpperCase() : `STD-${Date.now()}`;
    setStudentUsn(normalizedUsn);
    setIsLoggedIn(true);
    localStorage.setItem('student_usn', normalizedUsn);

    if (name) {
      setStudentName(name);
      localStorage.setItem('student_name', name);
    }
    if (phone) {
      setStudentPhone(phone);
      localStorage.setItem('student_phone', phone);
    }
  };

  const logout = () => {
    setIsLoggedIn(false);
    setStudentUsn(null);
    setStudentName(null);
    setStudentPhone(null);
    localStorage.removeItem('student_usn');
    localStorage.removeItem('student_name');
    localStorage.removeItem('student_phone');
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
      studentName,
      studentPhone,
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
