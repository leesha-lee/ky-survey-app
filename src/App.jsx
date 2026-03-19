import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Nav from './components/Nav';
import SurveyList from './pages/SurveyList';
import SurveyCreate from './pages/SurveyCreate';
import SurveyTake from './pages/SurveyTake';
import SurveyReport from './pages/SurveyReport';
import SurveyCompare from './pages/SurveyCompare';
import { useDB } from './hooks/useDB';
import './App.css';

function AppContent() {
  const { blobCount } = useDB();

  return (
    <>
      <Nav />
      <Routes>
        <Route path="/" element={<SurveyList />} />
        <Route path="/create" element={<SurveyCreate />} />
        <Route path="/edit/:id" element={<SurveyCreate />} />
        <Route path="/take/:id" element={<SurveyTake />} />
        <Route path="/report/:id" element={<SurveyReport />} />
        <Route path="/compare" element={<SurveyCompare />} />
      </Routes>
      <div className="db-info">IndexedDB | Blobs: {blobCount}</div>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter basename="/ky-survey-app">
      <AppContent />
    </BrowserRouter>
  );
}
