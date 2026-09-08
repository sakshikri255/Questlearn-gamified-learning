import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import NavBar from "./components/NavBar.jsx";
import HomePage from "./pages/HomePage.jsx";
import MissionPage from "./pages/MissionPage.jsx";
import MuseumPage from "./pages/MuseumPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import StageMapPage from "./pages/StageMapPage.jsx";
import LeaderboardPage from "./pages/LeaderboardPage.jsx";
import StreakPage from "./pages/StreakPage.jsx";
import TeamPage from "./pages/TeamPage.jsx";

function App() {
  return (
    <BrowserRouter>
      <NavBar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/mission" element={<MissionPage />} />
        <Route path="/museum" element={<MuseumPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/stages" element={<StageMapPage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/streak" element={<StreakPage />} />
        <Route path="/team" element={<TeamPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
