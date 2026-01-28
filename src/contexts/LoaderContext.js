import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { loaderEvents } from '../utils/loaderEvents';

const LoaderContext = createContext();

export const useLoader = () => {
  const context = useContext(LoaderContext);
  if (!context) {
    throw new Error('useLoader must be used within a LoaderProvider');
  }
  return context;
};

export const LoaderProvider = ({ children }) => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('Cargando...');
  const [activeRequests, setActiveRequests] = useState(0);

  const showLoader = useCallback((msg = 'Cargando...') => {
    setMessage(msg);
    setLoading(true);
  }, []);

  const hideLoader = useCallback(() => {
    setLoading(false);
  }, []);

  useEffect(() => {
    const handleShow = (msg) => {
      setMessage(msg || 'Cargando...');
      setLoading(true);
      setActiveRequests(prev => prev + 1);
    };

    const handleHide = () => {
      setActiveRequests(prev => {
        const next = Math.max(0, prev - 1);
        if (next === 0) setLoading(false);
        return next;
      });
    };

    const forceHide = () => {
      setActiveRequests(0);
      setLoading(false);
    };

    loaderEvents.on('show', handleShow);
    loaderEvents.on('hide', handleHide);
    loaderEvents.on('forceHide', forceHide);

    return () => {
      loaderEvents.off('show', handleShow);
      loaderEvents.off('hide', handleHide);
      loaderEvents.off('forceHide', forceHide);
    };
  }, []);

  return (
    <LoaderContext.Provider value={{ loading, message, showLoader, hideLoader }}>
      {children}
    </LoaderContext.Provider>
  );
};
