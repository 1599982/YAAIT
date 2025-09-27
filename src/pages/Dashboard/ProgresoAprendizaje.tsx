import PageMeta from "../../components/common/PageMeta";

export default function ProgresoAprendizaje() {
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
              <div className="bg-white rounded-3xl border-4 border-green-400 p-12 text-center shadow-lg hover:shadow-xl transition-shadow cursor-pointer h-40 flex items-center justify-center">
                <h3 className="text-6xl font-bold text-gray-800 rampart-font">
                  abc
                </h3>
              </div>

              {/* Card Vocales */}
              <div className="bg-white rounded-3xl border-4 border-purple-400 p-12 text-center shadow-lg hover:shadow-xl transition-shadow cursor-pointer h-40 flex items-center justify-center">
                <h3 className="text-6xl font-bold text-gray-800 rampart-font">
                  vocales
                </h3>
              </div>

              {/* Card Palabras */}
              <div className="bg-white rounded-3xl border-4 border-orange-400 p-12 text-center shadow-lg hover:shadow-xl transition-shadow cursor-pointer h-40 flex items-center justify-center">
                <h3 className="text-6xl font-bold text-gray-800 rampart-font">
                  palabras
                </h3>
              </div>

              {/* Card Números */}
              <div className="bg-white rounded-3xl border-4 border-red-400 p-12 text-center shadow-lg hover:shadow-xl transition-shadow cursor-pointer h-40 flex items-center justify-center">
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
                    strokeDashoffset={`${2 * Math.PI * 80 * (1 - 0.7555)}`}
                    className="transition-all duration-1000 ease-out"
                    strokeLinecap="round"
                  />
                </svg>
                {/* Texto central */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-gray-800">
                      75.55%
                    </div>
                    <div className="text-green-500 text-lg font-semibold">
                      +10%
                    </div>
                  </div>
                </div>
              </div>

              {/* Estado */}
              <div className="text-center">
                <span className="inline-block bg-orange-100 text-orange-600 px-6 py-3 rounded-full text-lg font-semibold">
                  En Proceso
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
