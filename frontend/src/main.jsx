import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><App /><Toaster position="top-right" toastOptions={{ style: { background: '#171c2b', color: '#fff', border: '1px solid #ffffff1a' } }} /></BrowserRouter>
  </React.StrictMode>
);
