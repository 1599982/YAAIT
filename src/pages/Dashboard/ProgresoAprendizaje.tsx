import PageMeta from "../../components/common/PageMeta";
import { useNavigate } from "react-router";
import { useEffect, useState } from "react";
import handLandmarksDB, { DatabaseStats } from "../../services/database";
import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";

export default function ProgresoAprendizaje() {
  const navigate = useNavigate();
  const [dbStats, setDbStats] = useState<DatabaseStats[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);

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

  const overallProgress = dbStats.length > 0 ? 
    ['Numeros', 'Vocales', 'Abecedario', 'Palabras']
      .map(cat => getCategoryProgress(cat))
      .reduce((sum, progress) => sum + progress, 0) / 4 
    : 0;

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
                  Modelos entrenados
                </h2>
                <p className="text-gray-600 text-lg">Aprendiste un</p>
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
                    strokeDashoffset={`${2 * Math.PI * 80 * (1 - overallProgress / 100)}`}
                    className="transition-all duration-1000 ease-out"
                    strokeLinecap="round"
                  />
                </svg>
                {/* Texto central */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-gray-800">
                      {overallProgress.toFixed(1)}%
                    </div>
                    <div className="text-blue-500 text-lg font-semibold">
                      {totalRecords} muestras
                    </div>
                  </div>
                </div>
              </div>

              {/* Estado */}
              <div className="text-center">
                <span className={`inline-block px-6 py-3 rounded-full text-lg font-semibold ${
                  overallProgress < 25 
                    ? 'bg-red-100 text-red-600' 
                    : overallProgress < 75 
                    ? 'bg-orange-100 text-orange-600' 
                    : 'bg-green-100 text-green-600'
                }`}>
                  {overallProgress < 25 ? 'Iniciando' : overallProgress < 75 ? 'En Proceso' : 'Avanzado'}
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

        {/* Test and Cleanup Buttons for Database */}
        <div className="mt-8 text-center space-x-4">
          <button
            onClick={async () => {
              try {
                console.log('🧪 Testing database functionality...');
                
                // Verify database status first
                const dbStatus = await handLandmarksDB.verifyDatabaseStatus();
                console.log('📊 Database status:', dbStatus);
                
                if (!dbStatus.isValid) {
                  console.error('❌ Database invalid:', dbStatus.error);
                  alert(`Base de datos inválida: ${dbStatus.error}. Usa el botón "Reset DB" para solucionarlo.`);
                  return;
                }
                
                // Test saving sample data
                const sessionId = handLandmarksDB.generateSessionId();
                const sampleLandmarks = Array.from({ length: 21 }, () => ({
                  x: Math.random(),
                  y: Math.random(),
                  z: Math.random()
                }));
                
                await handLandmarksDB.saveTrainingData('Test', 'Sample', sampleLandmarks, sessionId);
                console.log('✅ Sample data saved successfully');
                
                // Reload stats
                const stats = await handLandmarksDB.getTrainingStats();
                const size = await handLandmarksDB.getDatabaseSize();
                setDbStats(stats);
                setTotalRecords(size);
                
                alert('Test completado exitosamente! Revisa la consola para más detalles.');
              } catch (error) {
                console.error('❌ Database test failed:', error);
                alert(`Error en el test: ${error instanceof Error ? error.message : 'Unknown error'}`);
              }
            }}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            🧪 Probar Base de Datos
          </button>
          
          <button
            onClick={async () => {
              if (window.confirm('¿Estás seguro de que quieres resetear completamente la base de datos? Esto eliminará todos los datos de entrenamiento.')) {
                try {
                  console.log('🔄 Resetting database...');
                  
                  // Delete and recreate database
                  await handLandmarksDB.deleteDatabase();
                  console.log('🗑️ Database deleted');
                  
                  // Wait for deletion to complete
                  await new Promise(resolve => setTimeout(resolve, 1000));
                  
                  // Reinitialize
                  await handLandmarksDB.ensureDB();
                  console.log('✅ Database recreated');
                  
                  // Verify it worked
                  const dbStatus = await handLandmarksDB.verifyDatabaseStatus();
                  console.log('📊 New database status:', dbStatus);
                  
                  if (dbStatus.isValid) {
                    // Reload stats
                    const stats = await handLandmarksDB.getTrainingStats();
                    const size = await handLandmarksDB.getDatabaseSize();
                    setDbStats(stats);
                    setTotalRecords(size);
                    
                    console.log('🎉 Database reset completed successfully');
                    alert('Base de datos reseteada exitosamente! Ahora puedes entrenar elementos.');
                  } else {
                    throw new Error(`Database still invalid after reset: ${dbStatus.error}`);
                  }
                } catch (error) {
                  console.error('❌ Database reset failed:', error);
                  alert(`Error al resetear la base de datos: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
              }
            }}
            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            🔄 Reset DB
          </button>
          
          <button
            onClick={async () => {
              try {
                console.log('🔍 Checking database status...');
                const dbStatus = await handLandmarksDB.verifyDatabaseStatus();
                const size = await handLandmarksDB.getDatabaseSize();
                const stats = await handLandmarksDB.getTrainingStats();
                
                console.log('📊 Complete database status:', {
                  isValid: dbStatus.isValid,
                  objectStores: dbStatus.objectStores,
                  error: dbStatus.error,
                  totalRecords: size,
                  categories: stats.length
                });
                
                const statusMessage = `
Estado: ${dbStatus.isValid ? '✅ Válida' : '❌ Inválida'}
Object Stores: ${dbStatus.objectStores.join(', ')}
Total Registros: ${size}
Categorías únicas: ${new Set(stats.map(s => s.category)).size}
${dbStatus.error ? `Error: ${dbStatus.error}` : ''}
                `.trim();
                
                alert(statusMessage);
              } catch (error) {
                console.error('❌ Status check failed:', error);
                alert(`Error verificando estado: ${error instanceof Error ? error.message : 'Unknown error'}`);
              }
            }}
            className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            🔍 Verificar Estado
          </button>
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
