import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './App.css';

// Handle #reset hash: delete IndexedDB and reload
if (window.location.hash === '#reset') {
  window.history.replaceState(null, '', window.location.pathname);
  const req = indexedDB.deleteDatabase('SurveyAppDB');
  req.onsuccess = () => {
    localStorage.removeItem('survey_app_data');
    window.location.reload();
  };
  req.onerror = () => {
    window.location.reload();
  };
} else {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
