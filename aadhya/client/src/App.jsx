import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./layouts/AppLayout";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import Classes from "./pages/Classes";
import ClassDetail from "./pages/ClassDetail";
import StudentProfile from "./pages/StudentProfile";
import StagePlaceholder from "./pages/StagePlaceholder";
import StaffProfile from "./pages/StaffProfile";
import Settings from "./pages/Settings";
import Contact from "./pages/Contact";
import About from "./pages/About";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/auth" replace />} />
          <Route path="/auth" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="onboarding" element={<Onboarding />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="classes" element={<Classes />} />
            <Route path="classes/:classId" element={<ClassDetail />} />
            <Route path="students/:studentId" element={<StudentProfile />} />
            <Route path="attendance" element={<StagePlaceholder title="Attendance" text="Attendance marking will be available here." />} />
            <Route path="tests" element={<StagePlaceholder title="Tests & Marks" text="Tests and marks will be available here." />} />
            <Route path="reports" element={<StagePlaceholder title="Reports" text="Attendance and academic reports will be available here." />} />
            <Route path="profile" element={<StaffProfile />} />
            <Route path="staff" element={<StaffProfile />} />
            <Route path="settings" element={<Settings />} />
            <Route path="contact" element={<Contact />} />
            <Route path="about" element={<About />} />
          </Route>
          <Route path="*" element={<Navigate to="/auth" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
