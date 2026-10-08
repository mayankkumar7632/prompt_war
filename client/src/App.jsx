import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./components/layout/AppLayout.jsx";
import HomePage from "./features/home/HomePage.jsx";
import ProfilePage from "./features/learner/ProfilePage.jsx";
import CreateStoryPage from "./features/story/CreateStoryPage.jsx";
import StoryReaderPage from "./features/story/StoryReaderPage.jsx";
import QuizPage from "./features/checkpoint/QuizPage.jsx";
import ResultPage from "./features/report/ResultPage.jsx";
import ParentDashboardPage from "./features/report/ParentDashboardPage.jsx";
import TeacherDashboardPage from "./features/report/TeacherDashboardPage.jsx";
import LoginPage from "./features/auth/LoginPage.jsx";
import RegisterPage from "./features/auth/RegisterPage.jsx";
import RequireRole from "./components/common/RequireRole.jsx";
import StudentDashboardPage from "./features/student/StudentDashboardPage.jsx";
import StudentProfilePage from "./features/student/StudentProfilePage.jsx";
import StudentCreateStoryPage from "./features/student/StudentCreateStoryPage.jsx";
import StudentStoriesPage from "./features/student/StudentStoriesPage.jsx";
import StudentStoryPage from "./features/student/StudentStoryPage.jsx";
import StudentQuizPage from "./features/student/StudentQuizPage.jsx";
import StudentProgressPage from "./features/student/StudentProgressPage.jsx";

export default function App() {
  return (
    <Routes>
      <Route element={<RequireRole roles={["parent", "teacher"]} allowGuest><AppLayout /></RequireRole>}>
        <Route path="/" element={<HomePage />} />
        <Route path="/profile" element={<RequireRole roles={["parent", "teacher"]}><ProfilePage /></RequireRole>} />
        <Route path="/create-story" element={<RequireRole roles={[]} allowGuest><CreateStoryPage /></RequireRole>} />
        <Route path="/story-reader" element={<RequireRole roles={[]} allowGuest><StoryReaderPage /></RequireRole>} />
        <Route path="/quiz" element={<RequireRole roles={[]} allowGuest><QuizPage /></RequireRole>} />
        <Route path="/result" element={<RequireRole roles={[]} allowGuest><ResultPage /></RequireRole>} />
        {["/parent-dashboard", "/parent-children", "/parent-growth", "/parent-recommendations"].map((path) => (
          <Route key={path} path={path} element={<RequireRole roles={["parent"]}><ParentDashboardPage /></RequireRole>} />
        ))}
        {["/teacher-dashboard", "/teacher-students", "/teacher-growth", "/teacher-topics", "/teacher-recommendations"].map((path) => (
          <Route key={path} path={path} element={<RequireRole roles={["teacher"]}><TeacherDashboardPage /></RequireRole>} />
        ))}
      </Route>
      <Route path="/student" element={<RequireRole roles={["student"]}><AppLayout /></RequireRole>}>
        <Route path="dashboard" element={<StudentDashboardPage />} />
        <Route path="profile" element={<StudentProfilePage />} />
        <Route path="create-story" element={<StudentCreateStoryPage />} />
        <Route path="stories" element={<StudentStoriesPage />} />
        <Route path="stories/:storyId" element={<StudentStoryPage />} />
        <Route path="quiz/:storyId" element={<StudentQuizPage />} />
        <Route path="progress" element={<StudentProgressPage />} />
      </Route>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
