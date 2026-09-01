import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./components";
import {
  Login,
  Register,
  Dashboard,
  FarmerProfile,
  MyCrops,
  AddCrop,
  CentreFinder,
  CentreDetails,
  BookingConfirmation,
  QueueTracker,
  OperatorDashboard,
} from "./pages";

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <FarmerProfile />
              </ProtectedRoute>
            }
          />

          <Route
            path="/crops"
            element={
              <ProtectedRoute>
                <MyCrops />
              </ProtectedRoute>
            }
          />

          <Route
            path="/crops/add"
            element={
              <ProtectedRoute>
                <AddCrop />
              </ProtectedRoute>
            }
          />

          {/* Procurement Center Routes */}
          <Route
            path="/centres"
            element={
              <ProtectedRoute>
                <CentreFinder />
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
            path="/booking-confirmation"
            element={
              <ProtectedRoute>
                <BookingConfirmation />
              </ProtectedRoute>
            }
          />

          <Route
            path="/queue-tracker"
            element={
              <ProtectedRoute>
                <QueueTracker />
              </ProtectedRoute>
            }
          />

          <Route
            path="/operator-dashboard"
            element={
              <ProtectedRoute>
                <OperatorDashboard />
              </ProtectedRoute>
            }
          />

          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
