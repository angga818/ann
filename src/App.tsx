import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { AnimatePresence, MotionConfig } from "framer-motion";
import { ToastProvider } from "@/components/toast";
import { AppBackground } from "@/components/AppBackground";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { RequireAdmin, RequireAuth } from "@/components/auth/guards";
import HomePage from "@/pages/HomePage";
import LoginPage from "@/pages/auth/LoginPage";
import UsersPage from "@/pages/host/UsersPage";
import HostDashboardPage from "@/pages/host/HostDashboardPage";
import HostLibraryPage from "@/pages/host/HostLibraryPage";
import QuizEditorPage from "@/pages/host/QuizEditorPage";
import HostLivePage from "@/pages/host/HostLivePage";
import HostReportsPage from "@/pages/host/HostReportsPage";
import HostReportDetailPage from "@/pages/host/HostReportDetailPage";
import JoinPage from "@/pages/player/JoinPage";
import PlayerLivePage from "@/pages/player/PlayerLivePage";

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <HashRouter>
        <ToastProvider>
          <AuthProvider>
            <AppBackground />
            <AnimatePresence mode="wait">
              <Routes>
                {/* Publik */}
                <Route path="/" element={<HomePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/join" element={<JoinPage />} />
                <Route path="/join/:pin" element={<JoinPage />} />
                <Route path="/play/:pin" element={<PlayerLivePage />} />

                {/* Area host: wajib login host/admin */}
                <Route element={<RequireAuth />}>
                  <Route path="/host" element={<HostDashboardPage />} />
                  <Route path="/host/library" element={<HostLibraryPage />} />
                  <Route path="/host/quiz/new" element={<QuizEditorPage />} />
                  <Route path="/host/quiz/:quizId" element={<QuizEditorPage />} />
                  <Route path="/host/live/:pin" element={<HostLivePage />} />
                  <Route path="/host/reports" element={<HostReportsPage />} />
                  <Route path="/host/reports/:reportId" element={<HostReportDetailPage />} />

                  {/* User management: admin saja */}
                  <Route element={<RequireAdmin />}>
                    <Route path="/host/users" element={<UsersPage />} />
                  </Route>
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </AnimatePresence>
          </AuthProvider>
        </ToastProvider>
      </HashRouter>
    </MotionConfig>
  );
}
