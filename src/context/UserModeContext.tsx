import { createContext, useContext, useState, ReactNode } from 'react';

type UserMode = 'student' | 'teacher';

interface UserModeContextType {
  mode: UserMode;
  toggleMode: () => void;
  isTeacher: boolean;
  isStudent: boolean;
}

const UserModeContext = createContext<UserModeContextType | undefined>(undefined);

interface UserModeProviderProps {
  children: ReactNode;
}

export const UserModeProvider = ({ children }: UserModeProviderProps) => {
  const [mode, setMode] = useState<UserMode>('student');

  const toggleMode = () => {
    setMode(prevMode => prevMode === 'student' ? 'teacher' : 'student');
  };

  const isTeacher = mode === 'teacher';
  const isStudent = mode === 'student';

  return (
    <UserModeContext.Provider value={{ mode, toggleMode, isTeacher, isStudent }}>
      {children}
    </UserModeContext.Provider>
  );
};

export const useUserMode = () => {
  const context = useContext(UserModeContext);
  if (context === undefined) {
    throw new Error('useUserMode must be used within a UserModeProvider');
  }
  return context;
};
