import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Nav from './components/Nav';
import SurveyList from './pages/SurveyList';
import SurveyCreate from './pages/SurveyCreate';
import SurveyTake from './pages/SurveyTake';
import SurveyReport from './pages/SurveyReport';
import SurveyCompare from './pages/SurveyCompare';
import { useDB } from './hooks/useDB';
import { useAuth, AuthProvider } from './hooks/useAuth';
import { isAdmin } from './config/roles';
import './App.css';

function AdminRoute({ children }) {
  const { currentUser } = useAuth();
  if (!isAdmin(currentUser)) return <Navigate to="/" replace />;
  return children;
}

function AppContent() {
  const { blobCount } = useDB();

  return (
    <>
      <Nav />
      <Routes>
        <Route path="/" element={<SurveyList />} />
        <Route path="/create" element={<AdminRoute><SurveyCreate /></AdminRoute>} />
        <Route path="/edit/:id" element={<AdminRoute><SurveyCreate /></AdminRoute>} />
        <Route path="/take/:id" element={<SurveyTake />} />
        <Route path="/report/:id" element={<AdminRoute><SurveyReport /></AdminRoute>} />
        <Route path="/compare" element={<AdminRoute><SurveyCompare /></AdminRoute>} />
      </Routes>
      <div className="db-info">IndexedDB | Blobs: {blobCount}</div>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter basename="/ky-survey-app">
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  );
}
