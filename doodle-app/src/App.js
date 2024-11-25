// App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import DoodlePage from './components/DoodlePage';
import ImageGalleryPage from './components/ImageGalleryPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<DoodlePage />} />
        <Route path="/gallery/:predictedCategory" element={<ImageGalleryPage />} />
      </Routes>
    </Router>
  );
}

export default App;
