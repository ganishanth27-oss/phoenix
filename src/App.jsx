import { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// ==================== SPLASH SCREEN ====================
import SplashScreen from "./components/SplashScreen";

// ==================== AUTH ====================
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";

// ==================== ADMIN ====================
import AdminDashboard from "./pages/admin/AdminDashboard";
import Managers from "./pages/admin/Managers";
import Users from "./pages/admin/Users";
import Services from "./pages/admin/Services";
import Requests from "./pages/admin/Requests";
import Projects from "./pages/admin/Projects";
import Tasks from "./pages/admin/Tasks";
import AdminFiles from "./pages/admin/AdminFiles";
import ManagerPermissions from "./pages/admin/ManagerPermissions";
import ActivityLogs from "./pages/admin/ActivityLogs";
import Settings from "./pages/admin/Settings";

// ==================== MANAGER ====================
import ManagerDashboard from "./pages/manager/ManagerDashboard";
import ManagerRequests from "./pages/manager/ManagerRequests";
import ManagerUsers from "./pages/manager/ManagerUsers";
import ManagerProjects from "./pages/manager/ManagerProjects";
import ManagerTasks from "./pages/manager/ManagerTasks";
import ManagerFiles from "./pages/manager/ManagerFiles";
import ManagerReviewWork from "./pages/manager/ManagerReviewWork";
import ManagerReports from "./pages/manager/ManagerReports";

// ==================== USER ====================
import UserDashboard from "./pages/user/UserDashboard";

// ==================== PROTECTED ROUTE ====================
import ProtectedRoute from "./components/ProtectedRoute";


function App() {
  // Show splash screen when website first opens
  const [showSplash, setShowSplash] = useState(true);

  // ==================== SPLASH SCREEN ====================
  if (showSplash) {
    return (
      <SplashScreen
        onFinish={() => setShowSplash(false)}
      />
    );
  }

  // ==================== MAIN APPLICATION ====================
  return (
    <BrowserRouter>

      <Routes>

        {/* =====================================================
            AUTH
        ===================================================== */}

        <Route
          path="/"
          element={<Login />}
        />

        <Route
          path="/register"
          element={<Register />}
        />


        {/* =====================================================
            ADMIN
        ===================================================== */}

        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/managers"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <Managers />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/users"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <Users />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/services"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <Services />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/requests"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <Requests />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/projects"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <Projects />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/tasks"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <Tasks />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/files"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminFiles />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/permissions"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <ManagerPermissions />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/activity-logs"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <ActivityLogs />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/settings"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <Settings />
            </ProtectedRoute>
          }
        />


        {/* =====================================================
            MANAGER
        ===================================================== */}

        <Route
          path="/manager"
          element={
            <ProtectedRoute allowedRoles={["manager"]}>
              <ManagerDashboard />
            </ProtectedRoute>
          }
        />

        {/* Manager Requests */}

        <Route
          path="/manager/requests"
          element={
            <ProtectedRoute allowedRoles={["manager"]}>
              <ManagerRequests />
            </ProtectedRoute>
          }
        />

        {/* Manager Users */}

        <Route
          path="/manager/users"
          element={
            <ProtectedRoute allowedRoles={["manager"]}>
              <ManagerUsers />
            </ProtectedRoute>
          }
        />

        {/* Manager Projects */}

        <Route
          path="/manager/projects"
          element={
            <ProtectedRoute allowedRoles={["manager"]}>
              <ManagerProjects />
            </ProtectedRoute>
          }
        />

        {/* Manager Tasks */}

        <Route
          path="/manager/tasks"
          element={
            <ProtectedRoute allowedRoles={["manager"]}>
              <ManagerTasks />
            </ProtectedRoute>
          }
        />

        {/* Manager Files */}

        <Route
          path="/manager/files"
          element={
            <ProtectedRoute allowedRoles={["manager"]}>
              <ManagerFiles />
            </ProtectedRoute>
          }
        />

        {/* Manager Review Work */}

        <Route
          path="/manager/review"
          element={
            <ProtectedRoute allowedRoles={["manager"]}>
              <ManagerReviewWork />
            </ProtectedRoute>
          }
        />

        {/* Manager Reports */}

        <Route
          path="/manager/reports"
          element={
            <ProtectedRoute allowedRoles={["manager"]}>
              <ManagerReports />
            </ProtectedRoute>
          }
        />


        {/* =====================================================
            USER
        ===================================================== */}

        <Route
          path="/user"
          element={
            <ProtectedRoute allowedRoles={["user"]}>
              <UserDashboard />
            </ProtectedRoute>
          }
        />

      </Routes>

    </BrowserRouter>
  );
}

export default App;