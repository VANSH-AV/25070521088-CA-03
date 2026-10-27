import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext.jsx';
import { GuestOnlyRoute, ProtectedRoute, StudentRoute } from './auth/RouteGuards.jsx';
import { AboutPage } from './pages/AboutPage.jsx';
import { ApplicationsPage } from './pages/ApplicationsPage.jsx';
import { AuthPage } from './pages/AuthPage.jsx';
import { ContactPage } from './pages/ContactPage.jsx';
import { DashboardPage } from './pages/DashboardPage.jsx';
import { DashboardProjectsPage } from './pages/DashboardProjectsPage.jsx';
import { HomePage } from './pages/HomePage.jsx';
import { NotFoundPage } from './pages/NotFoundPage.jsx';
import { ProfileSettingsPage } from './pages/ProfileSettingsPage.jsx';
import { ProjectCreatePage } from './pages/ProjectCreatePage.jsx';
import { ProjectDetailPage } from './pages/ProjectDetailPage.jsx';
import { ProjectEditPage } from './pages/ProjectEditPage.jsx';
import { ProjectsPage } from './pages/ProjectsPage.jsx';
import { StudentProfilePage } from './pages/StudentProfilePage.jsx';
import { WorkspacePage } from './pages/WorkspacePage.jsx';
import './styles/tokens.css';
import './styles/global.css';
import './styles/components.css';
import './styles/preview.css';
import './styles/auth.css';
import './styles/pages.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route
            path="/projects/new"
            element={
              <StudentRoute>
                <ProjectCreatePage />
              </StudentRoute>
            }
          />
          <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
          <Route
            path="/projects/:projectId/workspace"
            element={
              <ProtectedRoute>
                <WorkspacePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects/:projectId/edit"
            element={
              <StudentRoute>
                <ProjectEditPage />
              </StudentRoute>
            }
          />
          <Route path="/students/:userId" element={<StudentProfilePage />} />
          <Route
            path="/login"
            element={
              <GuestOnlyRoute>
                <AuthPage mode="login" />
              </GuestOnlyRoute>
            }
          />
          <Route
            path="/register"
            element={
              <GuestOnlyRoute>
                <AuthPage mode="register" />
              </GuestOnlyRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/projects"
            element={
              <ProtectedRoute>
                <DashboardProjectsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/applications"
            element={
              <ProtectedRoute>
                <ApplicationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/profile"
            element={
              <ProtectedRoute>
                <ProfileSettingsPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
