import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import NavBar from "../components/NavBar.jsx";
import "./TopicsPage.css";

// TopicsPage — displays all topics fetched from /api/topics.
// Each topic card lists its subtopics with question counts.
// Clicking a subtopic navigates to /quiz/:subtopicId.

function TopicsPage() {
  const navigate = useNavigate();
  const [topics, setTopics]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const [openTopic, setOpenTopic] = useState(null); // topic id that is expanded

  useEffect(() => {
    fetch("/api/topics")
      .then((r) => r.json())
      .then((data) => { setTopics(data); setLoading(false); })
      .catch(() => { setError("Could not load topics. Is the backend running?"); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <div className="topics-page">
        <NavBar />
        <p className="topics-loading">Loading topics…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="topics-page">
        <NavBar />
        <div className="topics-error card">{error}</div>
      </div>
    );
  }

  return (
    <div className="topics-page">
      <NavBar />
      <div className="topics-content">
        <div className="topics-header">
          <button className="back-btn" onClick={() => navigate("/")}>← Back to Home</button>
          <h1 className="topics-title">📚 Topic-wise Quizzes</h1>
          <p className="topics-subtitle">
            Choose a topic, then pick a subtopic to start a timed quiz.
          </p>
        </div>

        <div className="topics-grid">
          {topics.map((topic) => {
            const isOpen = openTopic === topic.id;
            return (
              <div
                key={topic.id}
                className={`topic-card card-glass ${isOpen ? "topic-card--open" : ""}`}
              >
                {/* Topic header (click to expand) */}
                <button
                  className="topic-card-header"
                  onClick={() => setOpenTopic(isOpen ? null : topic.id)}
                  aria-expanded={isOpen}
                >
                  <span className="topic-card-emoji">{topic.emoji}</span>
                  <span className="topic-card-name">{topic.name}</span>
                  <span className="topic-card-count">
                    {topic.subtopics.length} subtopic{topic.subtopics.length !== 1 ? "s" : ""}
                  </span>
                  <span className="topic-card-chevron">{isOpen ? "▲" : "▼"}</span>
                </button>

                {/* Subtopics list */}
                {isOpen && (
                  <ul className="subtopics-list">
                    {topic.subtopics.map((sub) => (
                      <li key={sub.id} className="subtopic-item">
                        <button
                          className="subtopic-btn"
                          onClick={() => navigate(`/quiz/${sub.id}`, {
                            state: {
                              subtopicName: sub.name,
                              topicName:    topic.name,
                              topicEmoji:   topic.emoji,
                              topicId:      topic.id,
                            },
                          })}
                        >
                          <span className="subtopic-name">{sub.name}</span>
                          <span className="subtopic-meta">
                            {sub.questionCount} question{sub.questionCount !== 1 ? "s" : ""}
                          </span>
                          <span className="subtopic-arrow">▶ Start Quiz</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default TopicsPage;
