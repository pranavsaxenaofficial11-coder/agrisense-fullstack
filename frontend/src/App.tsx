import React, { useState, useEffect } from 'react';
import { LandingPage } from './pages/LandingPage';
import { NotFoundPage } from './pages/NotFoundPage';

export const App: React.FC = () => {
  const [currentRoute, setCurrentRoute] = useState<'landing' | '404'>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      const hash = window.location.hash;
      if (path === '/404' || path === '/404.html' || hash === '#404') {
        return '404';
      }
    }
    return 'landing';
  });

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      const hash = window.location.hash;
      if (path === '/404' || path === '/404.html' || hash === '#404') {
        setCurrentRoute('404');
      } else {
        setCurrentRoute('landing');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (route: 'landing' | '404') => {
    if (route === '404') {
      try {
        window.history.pushState({ page: '404' }, '', '/404');
      } catch {
        window.location.hash = '#404';
      }
      setCurrentRoute('404');
    } else {
      try {
        window.history.pushState({ page: 'landing' }, '', '/');
      } catch {
        window.location.hash = '';
      }
      setCurrentRoute('landing');
    }
  };

  if (currentRoute === '404') {
    return <NotFoundPage onNavigateHome={() => navigateTo('landing')} />;
  }

  return <LandingPage onNavigateTo404={() => navigateTo('404')} />;
};

export default App;
