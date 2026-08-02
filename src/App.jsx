import React, { Suspense, lazy, useEffect, useState } from 'react';
import './App.css';

const Landing = lazy(() => import('./pages/Landing'));
const Search = lazy(() => import('./pages/Search'));

function App() {
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const handleLocation = () => setPath(window.location.pathname);
    window.addEventListener('popstate', handleLocation);
    return () => window.removeEventListener('popstate', handleLocation);
  }, []);

  const page = path === '/search' ? <Search /> : <Landing />;

  return (
    <Suspense fallback={
      <div style={{ display: 'grid', placeItems: 'center', height: '100vh', background: '#010103' }}>
        <div style={{ width: 32, height: 32, border: '2px solid rgba(255,255,255,0.1)', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'iframe-spin 0.8s linear infinite' }} />
      </div>
    }>
      {page}
    </Suspense>
  );
}

export default App;
