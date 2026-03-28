import { createContext, useContext, useState, useCallback } from 'react';

const BulkProgressContext = createContext({});

export const BulkProgressProvider = ({ children }) => {
  const [bulkProgress, setBulkProgress] = useState({
    running: false,
    current: 0,
    total: 0,
    action: '',
    errors: 0,
  });

  const startBulk = useCallback((total, action) => {
    setBulkProgress({ running: true, current: 0, total, action, errors: 0 });
  }, []);

  const incrementBulk = useCallback((hasError = false) => {
    setBulkProgress((prev) => ({
      ...prev,
      current: prev.current + 1,
      errors: hasError ? prev.errors + 1 : prev.errors,
    }));
  }, []);

  const finishBulk = useCallback(() => {
    setBulkProgress((prev) => ({ ...prev, running: false }));
  }, []);

  return (
    <BulkProgressContext.Provider value={{ bulkProgress, startBulk, incrementBulk, finishBulk }}>
      {children}
    </BulkProgressContext.Provider>
  );
};

export const useBulkProgress = () => {
  return useContext(BulkProgressContext);
};
