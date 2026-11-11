import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { AnimatePresence, MotionConfig } from "framer-motion";
import { ToastProvider } from "@/components/toast";
import { AppBackground } from "@/components/AppBackground";
import HomePage from "@/pages/HomePage";
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
          <AppBackground />
          <AnimatePresence mode="wait">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/host" element={<HostDashboardPage />} />
              <Route path="/host/library" element={<HostLibraryPage />} />
              <Route path="/host/quiz/new" element={<QuizEditorPage />} />
              <Route path="/host/quiz/:quizId" element={<QuizEditorPage />} />
              <Route path="/host/live/:pin" element={<HostLivePage />} />
              <Route path="/host/reports" element={<HostReportsPage />} />
              <Route path="/host/reports/:reportId" element={<HostReportDetailPage />} />
              <Route path="/join" element={<JoinPage />} />
              <Route path="/join/:pin" element={<JoinPage />} />
              <Route path="/play/:pin" element={<PlayerLivePage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AnimatePresence>
        </ToastProvider>
      </HashRouter>
    </MotionConfig>
  );
}
