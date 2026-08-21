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
import Attendance from "./pages/Attendance";
import { AttendanceHistory, AttendanceSession } from "./pages/AttendanceHistory";
import Reports from "./pages/Reports";
import Tests, { TestDetail } from "./pages/Tests";
import StudentProfile from "./pages/StudentProfile";
import StaffProfile from "./pages/StaffProfile";
import Settings from "./pages/Settings";
import Contact from "./pages/Contact";
import About from "./pages/About";
import ImportAttendance from "./pages/ImportAttendance";

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
            <Route path="classes/:id" element={<ClassDetail />} />
            <Route path="students/:id" element={<StudentProfile />} />
            <Route path="attendance" element={<Attendance />} />
            <Route path="history" element={<AttendanceHistory />} />
            <Route path="history/:id" element={<AttendanceSession />} />
            <Route path="tests" element={<Tests />} />
            <Route path="tests/:id" element={<TestDetail />} />
            <Route path="reports" element={<Reports />} />
            <Route path="import" element={<ImportAttendance />} />
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
