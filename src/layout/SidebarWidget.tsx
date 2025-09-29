import { useState } from 'react';

export default function SidebarWidget() {
  const [showModal, setShowModal] = useState(false);

  return (
    <div
      className={`
        mx-auto mb-10 w-full max-w-60 rounded-2xl bg-gray-50 px-4 py-5 text-center dark:bg-white/[0.03]`}
    >
      <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">
        Yet Another Artificial Intelligence Training
      </h3>
      <p className="mb-4 text-gray-500 text-theme-sm dark:text-gray-400">
        Tu donación nos ayuda a mejorar el proyecto.
      </p>
      <button
        onClick={() => setShowModal(true)}
        className="w-full flex items-center justify-center p-3 font-medium text-white rounded-lg bg-brand-500 text-theme-sm hover:bg-brand-600"
      >
        Donar
      </button>

      {/* Modal */}
      {showModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowModal(false)}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6 relative"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              Gracias por tu apoyo
            </h3>
            <img 
              src="/images/yape.png" 
              alt="Código Yape" 
              className="w-full h-auto rounded-lg mb-4"
            />
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              Escanea el código para realizar tu donación
            </p>
            <button
              onClick={() => setShowModal(false)}
              className="w-full bg-brand-500 text-white py-2 rounded-lg hover:bg-brand-600 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}