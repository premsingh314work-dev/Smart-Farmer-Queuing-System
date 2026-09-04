import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./components";
import GovernmentCentreDetails from "./pages/GovernmentCentreDetails";
import {
  Login,
  Register,
  Dashboard,
  FarmerProfile,
  MyCrops,
  AddCrop,
  CentreDetails,
  BookingConfirmation,
  QueueTracker,
  BookingHistory,
} from "./pages";

import EnhancedCentreFinder from "./pages/EnhancedCentreFinder";

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* ==================== AUTH ==================== */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* ==================== ROLE-BASED DASHBOARD ==================== */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          {/* ==================== FARMER ROUTES ==================== */}

          <Route
            path="/profile"
            element={
              <ProtectedRoute allowedRoles={["FARMER"]}>
                <FarmerProfile />
              </ProtectedRoute>
            }
          />

          <Route
            path="/crops"
            element={
              <ProtectedRoute allowedRoles={["FARMER"]}>
                <MyCrops />
              </ProtectedRoute>
            }
          />

          <Route
            path="/crops/add"
            element={
              <ProtectedRoute allowedRoles={["FARMER"]}>
                <AddCrop />
              </ProtectedRoute>
            }
          />

          <Route
            path="/booking-confirmation"
            element={
              <ProtectedRoute allowedRoles={["FARMER"]}>
                <BookingConfirmation />
              </ProtectedRoute>
            }
          />

          <Route
            path="/queue-tracker"
            element={
              <ProtectedRoute allowedRoles={["FARMER"]}>
                <QueueTracker />
              </ProtectedRoute>
            }
          />

          <Route
            path="/bookings"
            element={
              <ProtectedRoute allowedRoles={["FARMER"]}>
                <BookingHistory />
              </ProtectedRoute>
            }
          />

          {/* ==================== PROCUREMENT CENTRES ==================== */}

          <Route
            path="/centres"
            element={
              <ProtectedRoute>
                <EnhancedCentreFinder />
              </ProtectedRoute>
            }
          />

          <Route
            path="/find-centre"
            element={
              <ProtectedRoute>
                <EnhancedCentreFinder />
              </ProtectedRoute>
            }
          />

          <Route
            path="/centre/:centreId"
            element={
              <ProtectedRoute>
                <CentreDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/government/centre/:centreId"
            element={
              <ProtectedRoute allowedRoles={["GOVERNMENT"]}>
                <GovernmentCentreDetails />
              </ProtectedRoute>
            }
          />
          {/* ==================== DEFAULT ROUTES ==================== */}

          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
