import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

import { FarmerDashboard } from "./dashboards/FarmerDashboard";
import { OperatorDashboard } from "./dashboards/OperatorDashboard";
import GovernmentDashboard from "./dashboards/GovernmentDashboard";

const Dashboard = () => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  switch (user.role) {
    case "FARMER":
      return <FarmerDashboard />;

    case "OPERATOR":
      return <OperatorDashboard />;

    case "GOVERNMENT":
      return <GovernmentDashboard />;

    default:
      return <Navigate to="/login" replace />;
  }
};

export default Dashboard;
