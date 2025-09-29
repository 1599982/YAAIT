import React, { useState, useEffect } from 'react';
import handLandmarksDB, { DatabaseStats, TrainingRecord } from '../../services/database';

interface DataVerificationProps {
  isOpen: boolean;
  onClose: () => void;
}

const DataVerification: React.FC<DataVerificationProps> = ({ isOpen, onClose }) => {
  const [stats, setStats] = useState<DatabaseStats[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedElement, setSelectedElement] = useState<string | number>('');
  const [recentRecords, setRecentRecords] = useState<TrainingRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsData, totalSize] = await Promise.all([
        handLandmarksDB.getTrainingStats(),
        handLandmarksDB.getDatabaseSize()
      ]);
      
      setStats(statsData);
      setTotalRecords(totalSize);
      
      // Load recent records (last 10)
      const allRecords = await handLandmarksDB.getTrainingData();
      const recent = allRecords
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 10);
      setRecentRecords(recent);
    } catch (error) {
      console.error('Error loading verification data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryElementFilter = async () => {
    if (!selectedCategory) return;
    
    setLoading(true);
    try {
      const records = await handLandmarksDB.getTrainingData(
        selectedCategory,
        selectedElement || undefined
      );
      setRecentRecords(records.slice(0, 20)); // Show up to 20 filtered records
    } catch (error) {
      console.error('Error filtering data:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearData = async (category?: string, element?: string | number) => {
    if (window.confirm(`¿Estás seguro de que quieres eliminar ${category && element ? `datos de ${category}-${element}` : category ? `todos los datos de ${category}` : 'todos los datos'}?`)) {
      setLoading(true);
      try {
        await handLandmarksDB.deleteTrainingData(category, element);
        await loadData();
        alert('Datos eliminados correctamente');
      } catch (error) {
        console.error('Error deleting data:', error);
        alert('Error al eliminar datos');
      } finally {
        setLoading(false);
      }
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const exportData = async () => {
    try {
      const allData = await handLandmarksDB.getTrainingData();
      const dataStr = JSON.stringify(allData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `training-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Error al exportar datos');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
            Verificación de Datos de Entrenamiento
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>

        {loading && (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}

        {!loading && (
          <>
            {/* Summary Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {totalRecords}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Total de Registros
                </div>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {stats.length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Elementos Únicos
                </div>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {new Set(stats.map(s => s.category)).size}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Categorías
                </div>
              </div>
            </div>

            {/* Data by Category */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
                Datos por Categoría y Elemento
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                {['Numeros', 'Vocales', 'Abecedario', 'Palabras'].map(category => (
                  <div key={category} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                    <h4 className="font-medium text-gray-800 dark:text-white mb-2">{category}</h4>
                    <div className="space-y-1">
                      {stats
                        .filter(stat => stat.category === category)
                        .sort((a, b) => String(a.element).localeCompare(String(b.element)))
                        .map(stat => (
                          <div key={`${stat.category}-${stat.element}`} className="flex justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">{stat.element}:</span>
                            <span className="font-medium text-gray-800 dark:text-white">{stat.count}</span>
                          </div>
                        ))
                      }
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Filter Controls */}
            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">
                Filtrar Registros
              </h3>
              <div className="flex flex-wrap gap-3 items-end">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Categoría
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-800 dark:text-white"
                  >
                    <option value="">Todas</option>
                    <option value="Numeros">Números</option>
                    <option value="Vocales">Vocales</option>
                    <option value="Abecedario">Abecedario</option>
                    <option value="Palabras">Palabras</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Elemento
                  </label>
                  <input
                    type="text"
                    value={selectedElement}
                    onChange={(e) => setSelectedElement(e.target.value)}
                    placeholder="Ej: A, 1, etc."
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-800 dark:text-white"
                  />
                </div>
                <button
                  onClick={handleCategoryElementFilter}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Filtrar
                </button>
                <button
                  onClick={loadData}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                >
                  Mostrar Recientes
                </button>
              </div>
            </div>

            {/* Recent Records */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
                Registros {selectedCategory ? 'Filtrados' : 'Recientes'}
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 dark:bg-gray-700">
                    <tr>
                      <th className="px-3 py-2 text-left text-gray-700 dark:text-gray-300">Categoría</th>
                      <th className="px-3 py-2 text-left text-gray-700 dark:text-gray-300">Elemento</th>
                      <th className="px-3 py-2 text-left text-gray-700 dark:text-gray-300">Landmarks</th>
                      <th className="px-3 py-2 text-left text-gray-700 dark:text-gray-300">Fecha</th>
                      <th className="px-3 py-2 text-left text-gray-700 dark:text-gray-300">Sesión</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentRecords.map((record, index) => (
                      <tr key={record.id || index} className="border-b border-gray-200 dark:border-gray-600">
                        <td className="px-3 py-2 text-gray-800 dark:text-gray-200">{record.category}</td>
                        <td className="px-3 py-2 text-gray-800 dark:text-gray-200">{record.element}</td>
                        <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{record.landmarks.length} puntos</td>
                        <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{formatTimestamp(record.timestamp)}</td>
                        <td className="px-3 py-2 text-gray-600 dark:text-gray-400 text-xs">
                          {record.sessionId.split('_')[1]}...
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {recentRecords.length === 0 && (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No hay registros para mostrar
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 justify-end">
              <button
                onClick={exportData}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Exportar Datos
              </button>
              <button
                onClick={() => clearData()}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Limpiar Todos los Datos
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DataVerification;