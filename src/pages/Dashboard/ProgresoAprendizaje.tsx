import PageMeta from "../../components/common/PageMeta";
import { useNavigate } from "react-router";
import { useEffect, useState } from "react";
import handLandmarksDB, { DatabaseStats } from "../../services/database";
import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";

export default function ProgresoAprendizaje() {
  const navigate = useNavigate();
  // UserMode context available but not used in this component currently
  const [dbStats, setDbStats] = useState<DatabaseStats[]>([]);
  const [, setTotalRecords] = useState(0);

  useEffect(() => {
    // Initialize database and load stats
    const initializeDatabase = async () => {
      try {
        console.log('🚀 Starting database initialization...');
        
        // Force database initialization
        await handLandmarksDB.ensureDB();
        console.log('✅ Database initialized successfully');
        
        // Wait a bit for database to be fully ready
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Test basic functionality
        console.log('🧪 Testing database functionality...');
        
        try {
          // Test saving a dummy record to verify everything works
          const testSessionId = handLandmarksDB.generateSessionId();
          const testLandmarks = [{ x: 0.5, y: 0.5, z: 0.5 }];
          
          const recordId = await handLandmarksDB.saveTrainingData(
            'Test',
            'Init',
            testLandmarks,
            testSessionId
          );
          console.log('✅ Test record saved successfully with ID:', recordId);
          
          // Delete the test record immediately
          await handLandmarksDB.deleteTrainingData('Test');
          console.log('✅ Test record cleaned up');
          
        } catch (testError) {
          console.error('❌ Database test failed:', testError);
          throw testError;
        }
        
        // Load training statistics
        const stats = await handLandmarksDB.getTrainingStats();
        const size = await handLandmarksDB.getDatabaseSize();
        
        console.log('📊 Database stats loaded:', {
          stats,
          totalRecords: size,
          categories: new Set(stats.map(s => s.category)).size
        });
        
        setDbStats(stats);
        setTotalRecords(size);
        
        // Log database status
        if (size === 0) {
          console.log('🔴 Database is empty - ready for training data');
        } else {
          console.log(`🟢 Database contains ${size} training records`);
        }
        
      } catch (error) {
        console.error('❌ Critical error initializing database:', error);
        
        // Try to recover by deleting and recreating database
        try {
          console.log('🔄 Attempting database recovery...');
          await handLandmarksDB.deleteDatabase();
          await new Promise(resolve => setTimeout(resolve, 500));
          await handLandmarksDB.ensureDB();
          console.log('✅ Database recovered successfully');
          
          // Load stats after recovery
          const stats = await handLandmarksDB.getTrainingStats();
          const size = await handLandmarksDB.getDatabaseSize();
          setDbStats(stats);
          setTotalRecords(size);
          
        } catch (recoveryError) {
          console.error('❌ Database recovery failed:', recoveryError);
          alert('Error crítico con la base de datos. Por favor recarga la página o prueba otro navegador.');
        }
      }
    };

    initializeDatabase();
  }, []);

  // Calculate training progress
  const getCategoryProgress = (category: string) => {
    const categoryStats = dbStats.filter(stat => stat.category === category);
    const totalSamples = categoryStats.reduce((sum, stat) => sum + stat.count, 0);
    
    // Assume we need at least 100 samples per category for good training
    const targetSamples = 100;
    return Math.min((totalSamples / targetSamples) * 100, 100);
  };

  // Removed overallProgress as it's no longer used - now using totalTrainedElements

  // Calcular total de elementos entrenados
  const getTotalTrainedElements = () => {
    if (dbStats.length === 0) return 0;
    
    return ['Numeros', 'Vocales', 'Abecedario', 'Palabras'].reduce((total, category) => {
      const categoryStats = dbStats.filter(stat => stat.category === category);
      return total + categoryStats.length;
    }, 0);
  };

  const totalTrainedElements = getTotalTrainedElements();
  
  // Calcular total posible de elementos
  const getTotalPossibleElements = () => {
    return 10 + 5 + 26 + 0; // Números (0-9), Vocales (A,E,I,O,U), Abecedario (A-Z), Palabras (variable)
  };

  const totalPossibleElements = getTotalPossibleElements();

  return (
    <>
      <PageMeta
        title="Progreso en mi aprendizaje | YAAIT"
        description="Página de progreso en el aprendizaje de lenguaje de señas"
      />
      <div className="p-8">
        {/* Título principal */}
        <h1 className="text-5xl font-bold text-purple-600 mb-12 text-center italic ink-free-font">
          Progreso en mi aprendizaje
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
          {/* Columna izquierda - Cards de categorías */}
          <div className="lg:col-span-2 flex items-center justify-center">
            <div className="grid grid-cols-2 gap-8">
              {/* Card ABC */}
              <div onClick={() => navigate("/allenamiento/abecedario")} className="bg-white rounded-3xl border-4 border-green-400 p-12 text-center shadow-lg hover:shadow-xl transition-shadow cursor-pointer h-40 flex items-center justify-center">
                <h3 className="text-6xl font-bold text-gray-800 rampart-font">
                  abc
                </h3>
              </div>

              {/* Card Vocales */}
              <div onClick={() => navigate("/allenamiento/vocales")} className="bg-white rounded-3xl border-4 border-purple-400 p-12 text-center shadow-lg hover:shadow-xl transition-shadow cursor-pointer h-40 flex items-center justify-center">
                <h3 className="text-6xl font-bold text-gray-800 rampart-font">
                  vocales
                </h3>
              </div>

              {/* Card Palabras */}
              <div onClick={() => navigate("/allenamiento/palore")} className="bg-white rounded-3xl border-4 border-orange-400 p-12 text-center shadow-lg hover:shadow-xl transition-shadow cursor-pointer h-40 flex items-center justify-center">
                <h3 className="text-6xl font-bold text-gray-800 rampart-font">
                  palabras
                </h3>
              </div>

              {/* Card Números */}
              <div onClick={() => navigate("/allenamiento/numeri")} className="bg-white rounded-3xl border-4 border-red-400 p-12 text-center shadow-lg hover:shadow-xl transition-shadow cursor-pointer h-40 flex items-center justify-center">
                <h3 className="text-6xl font-bold text-gray-800 rampart-font">
                  números
                </h3>
              </div>
            </div>
          </div>

          {/* Columna derecha - Progress Card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-3xl p-8 shadow-lg h-full flex flex-col justify-center">
              <div className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-800 mb-3">
                  Elementos Entrenados
                </h2>
                <p className="text-gray-600 text-lg">
                  {totalTrainedElements} de {totalPossibleElements} elementos completados
                </p>
              </div>

              {/* Gráfico circular */}
              <div className="relative w-64 h-64 mx-auto mb-8">
                <svg
                  className="w-full h-full transform -rotate-90"
                  viewBox="0 0 200 200"
                >
                  {/* Círculo de fondo */}
                  <circle
                    cx="100"
                    cy="100"
                    r="80"
                    stroke="#e5e7eb"
                    strokeWidth="20"
                    fill="none"
                  />
                  {/* Círculo de progreso */}
                  <circle
                    cx="100"
                    cy="100"
                    r="80"
                    stroke="#3b82f6"
                    strokeWidth="20"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 80}`}
                    strokeDashoffset={`${2 * Math.PI * 80 * (1 - (totalTrainedElements / totalPossibleElements))}`}
                    className="transition-all duration-1000 ease-out"
                    strokeLinecap="round"
                  />
                </svg>
                {/* Texto central */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-gray-800">
                      {totalTrainedElements}
                    </div>
                    <div className="text-blue-500 text-lg font-semibold">
                      elementos
                    </div>
                    <div className="text-gray-500 text-sm mt-1">
                      {((totalTrainedElements / totalPossibleElements) * 100).toFixed(1)}% completado
                    </div>
                  </div>
                </div>
              </div>

              {/* Estado */}
              <div className="text-center">
                <span className={`inline-block px-6 py-3 rounded-full text-lg font-semibold ${
                  totalTrainedElements < 10 
                    ? 'bg-red-100 text-red-600' 
                    : totalTrainedElements < 25 
                    ? 'bg-orange-100 text-orange-600' 
                    : 'bg-green-100 text-green-600'
                }`}>
                  {totalTrainedElements < 10 ? 'Iniciando' : totalTrainedElements < 25 ? 'En Proceso' : 'Avanzado'}
                </span>
              </div>

              {/* Database Stats */}
              {dbStats.length > 0 && (
                <div className="mt-6 space-y-2">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Datos por categoría:</h3>
                  {['Numeros', 'Vocales', 'Abecedario', 'Palabras'].map(category => {
                    const categoryStats = dbStats.filter(stat => stat.category === category);
                    const totalSamples = categoryStats.reduce((sum, stat) => sum + stat.count, 0);
                    const progress = getCategoryProgress(category);
                    
                    return (
                      <div key={category} className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">{category}:</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium">{totalSamples}</span>
                          <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-blue-500 rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(progress, 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>


        {/* Charts Section */}
        {dbStats.length > 0 && (
          <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Line Chart - Progress over time */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
                📈 Progreso de Entrenamiento por Categoría
              </h3>
              <Chart
                options={{
                  chart: {
                    fontFamily: "Outfit, sans-serif",
                    height: 350,
                    type: "line",
                    toolbar: { show: false },
                  },
                  colors: ["#465FFF", "#10B981", "#F59E0B", "#EF4444"],
                  stroke: {
                    curve: "smooth",
                    width: 3,
                  },
                  xaxis: {
                    categories: ['Números', 'Vocales', 'Abecedario', 'Palabras'],
                    labels: {
                      style: {
                        colors: "#6B7280",
                        fontSize: "12px",
                      },
                    },
                  },
                  yaxis: {
                    title: {
                      text: "Muestras de Entrenamiento",
                      style: {
                        color: "#6B7280",
                      },
                    },
                    labels: {
                      style: {
                        colors: "#6B7280",
                      },
                    },
                  },
                  grid: {
                    borderColor: "#E5E7EB",
                  },
                  legend: {
                    position: "top",
                    horizontalAlign: "right",
                  },
                  tooltip: {
                    y: {
                      formatter: (value: number) => `${value} muestras`,
                    },
                  },
                } as ApexOptions}
                series={[
                  {
                    name: "Total de Muestras",
                    data: ['Numeros', 'Vocales', 'Abecedario', 'Palabras'].map(category => {
                      const categoryStats = dbStats.filter(stat => stat.category === category);
                      return categoryStats.reduce((sum, stat) => sum + stat.count, 0);
                    }),
                  },
                ]}
                type="line"
                height={350}
              />
            </div>

            {/* Bar Chart - Elements trained per category */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
                📊 Elementos Entrenados por Categoría
              </h3>
              <Chart
                options={{
                  chart: {
                    fontFamily: "Outfit, sans-serif",
                    type: "bar",
                    height: 350,
                    toolbar: { show: false },
                  },
                  colors: ["#465FFF"],
                  plotOptions: {
                    bar: {
                      horizontal: false,
                      columnWidth: "55%",
                      borderRadius: 8,
                      borderRadiusApplication: "end",
                    },
                  },
                  dataLabels: {
                    enabled: true,
                    style: {
                      colors: ["#FFFFFF"],
                      fontSize: "12px",
                      fontWeight: "bold",
                    },
                  },
                  xaxis: {
                    categories: ['Números', 'Vocales', 'Abecedario', 'Palabras'],
                    labels: {
                      style: {
                        colors: "#6B7280",
                        fontSize: "12px",
                      },
                    },
                  },
                  yaxis: {
                    title: {
                      text: "Elementos Únicos",
                      style: {
                        color: "#6B7280",
                      },
                    },
                    labels: {
                      style: {
                        colors: "#6B7280",
                      },
                    },
                  },
                  grid: {
                    borderColor: "#E5E7EB",
                  },
                  tooltip: {
                    y: {
                      formatter: (value: number) => `${value} elementos`,
                    },
                  },
                } as ApexOptions}
                series={[
                  {
                    name: "Elementos Entrenados",
                    data: ['Numeros', 'Vocales', 'Abecedario', 'Palabras'].map(category => {
                      const categoryStats = dbStats.filter(stat => stat.category === category);
                      return categoryStats.length;
                    }),
                  },
                ]}
                type="bar"
                height={350}
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
