import { ReactNode } from 'react';
import { useUserMode } from '../../context/UserModeContext';

interface TeacherProtectedRouteProps {
  children: ReactNode;
}

export const TeacherProtectedRoute = ({ children }: TeacherProtectedRouteProps) => {
  const { isTeacher, toggleMode } = useUserMode();

  if (!isTeacher) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
          <div className="mb-6">
            <div className="text-6xl mb-4">🔒</div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
              Acceso Restringido
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Esta sección está disponible solo para profesores. El modo alumno tiene acceso limitado para enfocarse en el aprendizaje.
            </p>
          </div>
          
          <div className="space-y-4">
            <button
              onClick={toggleMode}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Cambiar a Modo Profesor
            </button>
            
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Los alumnos pueden usar la sección de <strong>Predicción</strong> para practicar con los modelos ya entrenados.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
