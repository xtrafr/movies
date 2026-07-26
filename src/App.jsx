import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';

const Landing = lazy(() => import('./pages/Landing'));
const Search = lazy(() => import('./pages/Search'));

function App() {
  return (
    <Router>
      <Suspense fallback={
        <div style={{ display: 'grid', placeItems: 'center', height: '100vh', background: '#010103' }}>
          <div style={{ width: 32, height: 32, border: '2px solid rgba(255,255,255,0.1)', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'iframe-spin 0.8s linear infinite' }} />
        </div>
      }>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/search" element={<Search />} />
          <Route path="*" element={<Landing />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
