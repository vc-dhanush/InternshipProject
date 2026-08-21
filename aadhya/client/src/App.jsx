import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import AppLayout from "./layouts/AppLayout";
import AuthPage, { ResetPasswordPage } from "./pages/AuthPage";
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
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/app" element={<AppLayout />}>
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
