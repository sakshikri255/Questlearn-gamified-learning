import React, { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { AuthProvider } from "./context/AuthContext.jsx";
import NavBar from "./components/NavBar.jsx";
import AppSidebar from "./components/AppSidebar.jsx";

// Lazy-load all pages — only the current page's chunk is downloaded on first load.
// Other chunks are fetched on demand as the user navigates.
const HomePage           = lazy(() => import("./pages/HomePage.jsx"));
const AuthPage           = lazy(() => import("./pages/AuthPage.jsx"));
const MissionPage        = lazy(() => import("./pages/MissionPage.jsx"));
const MuseumPage         = lazy(() => import("./pages/MuseumPage.jsx"));
const DashboardPage      = lazy(() => import("./pages/DashboardPage.jsx"));
const StageMapPage       = lazy(() => import("./pages/StageMapPage.jsx"));
const LeaderboardPage    = lazy(() => import("./pages/LeaderboardPage.jsx"));
const StreakPage          = lazy(() => import("./pages/StreakPage.jsx"));
const DailyChallengePage = lazy(() => import("./pages/DailyChallengePage.jsx"));
const TopicsPage         = lazy(() => import("./pages/TopicsPage.jsx"));
const TopicQuizPage      = lazy(() => import("./pages/TopicQuizPage.jsx"));
const PostQuizResultsPage= lazy(() => import("./pages/PostQuizResultsPage.jsx"));
const ProfilePage        = lazy(() => import("./pages/ProfilePage.jsx"));
const TeamPage           = lazy(() => import("./pages/TeamPage.jsx"));

// Minimal fallback shown while a page chunk is being fetched
function PageLoader() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", color: "#9ca3af", fontSize: "0.95rem" }}>
      Loading…
    </div>
  );
}

function AnimatedRoutes() {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/"               element={<HomePage />} />
        <Route path="/login"          element={<AuthPage />} />
        <Route path="/signup"         element={<AuthPage />} />
        <Route path="/forgot-password" element={<AuthPage />} />
        <Route path="/reset-password" element={<AuthPage />} />
        <Route path="/mission"        element={<MissionPage />} />
        <Route path="/museum"         element={<MuseumPage />} />
        <Route path="/dashboard"      element={<DashboardPage />} />
        <Route path="/profile"        element={<ProfilePage />} />
        <Route path="/stages"         element={<StageMapPage />} />
        <Route path="/leaderboard"    element={<LeaderboardPage />} />
        <Route path="/streak"         element={<StreakPage />} />
        <Route path="/daily-challenge" element={<DailyChallengePage />} />
        <Route path="/topics"         element={<TopicsPage />} />
        <Route path="/quiz/:subtopicId" element={<TopicQuizPage />} />
        <Route path="/quiz-results"   element={<PostQuizResultsPage />} />
        <Route path="/team"           element={<TeamPage />} />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="app-container">
          <NavBar />
          <div className="app-body">
            <AppSidebar />
            <main className="app-main-content">
              {/* Suspense catches lazy chunks loading between route changes */}
              <Suspense fallback={<PageLoader />}>
                <AnimatedRoutes />
              </Suspense>
            </main>
          </div>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

