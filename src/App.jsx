import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import Search from './pages/Search';
import DotGrid from './components/DotGrid';
import './App.css';

function App() {
  return (
    <>
      <DotGrid />
      <Router>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/search" element={<Search />} />
          <Route path="*" element={<Landing />} />
        </Routes>
      </Router>
    </>
  );
}

export default App;
