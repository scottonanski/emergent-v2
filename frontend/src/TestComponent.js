import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

function TestComponent() {
  const showTutorial = true;
  const setShowTutorial = () => {};

  return (
    <div className="h-screen bg-gray-50 flex">
      <AnimatePresence>
        {showTutorial && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl p-8"
            >
              <div className="text-center">
                <h2>Test Content</h2>
                <button onClick={() => setShowTutorial(false)}>
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default TestComponent;