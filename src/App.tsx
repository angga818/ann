import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { ToastProvider } from "@/components/toast";
import { AppBackground } from "@/components/AppBackground";
import HomePage from "@/pages/HomePage";
import HostQuizzesPage from "@/pages/host/HostQuizzesPage";
import QuizEditorPage from "@/pages/host/QuizEditorPage";
import HostLivePage from "@/pages/host/HostLivePage";
import JoinPage from "@/pages/player/JoinPage";
import PlayerLivePage from "@/pages/player/PlayerLivePage";

export default function App() {
  return (
    <HashRouter>
      <ToastProvider>
        <AppBackground />
        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/host" element={<HostQuizzesPage />} />
            <Route path="/host/quiz/new" element={<QuizEditorPage />} />
            <Route path="/host/quiz/:quizId" element={<QuizEditorPage />} />
            <Route path="/host/live/:pin" element={<HostLivePage />} />
            <Route path="/join" element={<JoinPage />} />
            <Route path="/join/:pin" element={<JoinPage />} />
            <Route path="/play/:pin" element={<PlayerLivePage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AnimatePresence>
      </ToastProvider>
    </HashRouter>
  );
}
