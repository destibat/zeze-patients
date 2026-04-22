import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/layout/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import UsersPage from './pages/admin/UsersPage';
import UserFormPage from './pages/admin/UserFormPage';
import PatientsPage from './pages/patients/PatientsPage';
import PatientFichePage from './pages/patients/PatientFichePage';
import PatientFormPage from './pages/patients/PatientFormPage';
import ConsultationFormPage from './pages/consultations/ConsultationFormPage';
import ConsultationFichePage from './pages/consultations/ConsultationFichePage';
import StockPage from './pages/StockPage';
import MonStockPage from './pages/MonStockPage';
import AgendaPage from './pages/AgendaPage';
import FacturationPage from './pages/FacturationPage';
import ConsultationsPage from './pages/ConsultationsPage';
import OrdonnancesPage from './pages/OrdonnancesPage';
import StatistiquesPage from './pages/StatistiquesPage';
import ParametresPage from './pages/ParametresPage';
import ChangerMotDePassePage from './pages/ChangerMotDePassePage';
import NotFoundPage from './pages/NotFoundPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,   // 5 minutes
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Route publique */}
          <Route path="/connexion" element={<LoginPage />} />

          {/* Changement de mot de passe obligatoire (pas de layout) */}
          <Route
            path="/changer-mot-de-passe"
            element={
              <ProtectedRoute>
                <ChangerMotDePassePage />
              </ProtectedRoute>
            }
          />

          {/* Routes protégées — layout principal */}
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="profil" element={<ParametresPage />} />

            {/* Backoffice administrateur */}
            <Route
              path="admin/utilisateurs"
              element={
                <ProtectedRoute roles={['administrateur']}>
                  <UsersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin/utilisateurs/nouveau"
              element={
                <ProtectedRoute roles={['administrateur']}>
                  <UserFormPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin/utilisateurs/:id/modifier"
              element={
                <ProtectedRoute roles={['administrateur']}>
                  <UserFormPage />
                </ProtectedRoute>
              }
            />

            {/* Patients */}
            <Route path="patients" element={<PatientsPage />} />
            <Route path="patients/nouveau" element={<PatientFormPage />} />
            <Route path="patients/:id" element={<PatientFichePage />} />
            <Route path="patients/:id/modifier" element={<PatientFormPage />} />
            <Route path="patients/:id/consultations/nouvelle" element={<ConsultationFormPage />} />
            <Route path="patients/:id/consultations/:consultationId" element={<ConsultationFichePage />} />
            <Route path="consultations" element={<ConsultationsPage />} />
            <Route path="rendez-vous" element={<AgendaPage />} />
            <Route path="ordonnances" element={<OrdonnancesPage />} />
            <Route path="facturation" element={<FacturationPage />} />
            <Route path="stock" element={<StockPage />} />
            <Route
              path="mon-stock"
              element={
                <ProtectedRoute roles={['delegue']}>
                  <MonStockPage />
                </ProtectedRoute>
              }
            />
            <Route path="statistiques" element={<StatistiquesPage />} />
            <Route path="parametres" element={<ParametresPage />} />
          </Route>

          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
