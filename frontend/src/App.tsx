import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from './components/Layout/DashboardLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthPage } from './pages/AuthPage';
import { SummariesPage } from './pages/SummariesPage';
import { FlashcardsPage } from './pages/FlashcardsPage';
import { MockTestsPage } from './pages/MockTestsPage';
import { SchedulePage } from './pages/SchedulePage';
import { ReportsPage } from './pages/ReportsPage';
import { GlossaryPage } from './pages/GlossaryPage';
import { PracticePage } from './pages/PracticePage';
import { FavoritesPage } from './pages/FavoritesPage';
import { useAuth } from './contexts/AuthContext';

function AuthenticatedRoutes() {
  return (
    <ProtectedRoute>
      <Routes>
        <Route element={<DashboardLayout />}>
          <Route path="/" element={<SummariesPage />} />
          <Route path="/flashcards" element={<FlashcardsPage />} />
          <Route path="/tests" element={<MockTestsPage />} />
          <Route path="/practice" element={<PracticePage />} />
          <Route path="/glossary" element={<GlossaryPage />} />
          <Route path="/favorites" element={<FavoritesPage />} />
          <Route path="/schedule" element={<SchedulePage />} />
          <Route path="/reports" element={<ReportsPage />} />
        </Route>
      </Routes>
    </ProtectedRoute>
  );
}

function AppRoutes() {
  const { isAuthenticated, isLoading } = useAuth();

  // Show nothing while checking auth status
  if (isLoading) {
    return null;
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <AuthPage />}
      />
      <Route path="/*" element={<AuthenticatedRoutes />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
