import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getFarmerCrops } from "../../api/crops";

const quickActions = [
  {
    label: "Profile",
    color: "bg-green-600 hover:bg-green-700",
    path: "/profile",
  },
  {
    label: "My Crops",
    color: "bg-blue-600 hover:bg-blue-700",
    path: "/crops",
  },
  {
    label: "Add Crop",
    color: "bg-amber-600 hover:bg-amber-700",
    path: "/crops/add",
  },
  {
    label: "Find Centres",
    color: "bg-purple-600 hover:bg-purple-700",
    path: "/centres",
  },
  {
    label: "Queue Tracker",
    color: "bg-emerald-600 hover:bg-emerald-700",
    path: "/queue-tracker",
  },
];

export const FarmerDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [crops, setCrops] = useState([]);

  useEffect(() => {
    const fetchCrops = async () => {
      try {
        const response = await getFarmerCrops();
        if (response?.success) {
          setCrops(response.crops || []);
        }
      } catch (error) {
        console.error("Failed to load crops summary:", error);
      }
    };

    fetchCrops();
  }, []);

  const totalCrops = crops.length;
  const availableCrops = crops.filter(
    (crop) => crop.status === "AVAILABLE",
  ).length;
  const pendingCrops = crops.filter((crop) => crop.status === "PENDING").length;

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100">
      <div className="max-w-6xl mx-auto py-12 px-4">
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-sm font-medium uppercase tracking-wide text-green-700">
                Farmer dashboard
              </p>
              <h1 className="text-4xl font-bold text-gray-900 mt-2">
                Welcome, {user?.name}!
              </h1>
              <p className="text-gray-600 mt-2">
                Smart Farmer Procurement System
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition duration-200"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-sm text-gray-500">Total Crops</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {totalCrops}
            </p>
            <p className="text-sm text-green-600 mt-2">
              {availableCrops} available
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-sm text-gray-500">Upcoming Bookings</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {pendingCrops || 0}
            </p>
            <p className="text-sm text-blue-600 mt-2">Pending review</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-sm text-gray-500">Queue Status</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">Normal</p>
            <p className="text-sm text-amber-600 mt-2">
              Estimated wait: {Math.max(15, totalCrops * 8)} min
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Profile Information
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Name:</span>
                <span className="font-semibold text-gray-900">
                  {user?.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Phone:</span>
                <span className="font-semibold text-gray-900">
                  {user?.phone}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Email:</span>
                <span className="font-semibold text-gray-900">
                  {user?.email || "Not provided"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Role:</span>
                <span className="font-semibold text-gray-900">
                  {user?.role}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Quick Actions
            </h2>
            <div className="space-y-3">
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  onClick={() => navigate(action.path)}
                  className={`w-full px-4 py-3 rounded-lg font-semibold text-white transition duration-200 ${action.color}`}
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            About Smart Farmer Procurement
          </h2>
          <p className="text-gray-700 leading-relaxed">
            Welcome to the Smart Farmer Procurement System! This platform helps
            reduce waiting times at procurement centres and provides real-time
            queue management. You can:
          </p>
          <ul className="list-disc list-inside mt-4 text-gray-700 space-y-2">
            <li>Register your crops and farming details</li>
            <li>Discover nearby procurement centres</li>
            <li>Book slots to avoid long queues</li>
            <li>Track your procurement status in real-time</li>
            <li>Receive notifications about your bookings</li>
            <li>View quality and payment status</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
