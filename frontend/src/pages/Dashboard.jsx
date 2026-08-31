import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const Dashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100">
      <div className="max-w-6xl mx-auto py-12 px-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Welcome, {user?.name}!</h1>
              <p className="text-gray-600 mt-2">Smart Farmer Procurement System</p>
            </div>
            <button
              onClick={handleLogout}
              className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition duration-200"
            >
              Logout
            </button>
          </div>
        </div>

        {/* User Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Profile Information</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Name:</span>
                <span className="font-semibold text-gray-900">{user?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Phone:</span>
                <span className="font-semibold text-gray-900">{user?.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Email:</span>
                <span className="font-semibold text-gray-900">{user?.email || 'Not provided'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Role:</span>
                <span className="font-semibold text-gray-900">{user?.role}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <button className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition duration-200">
                View Procurement Centres
              </button>
              <button className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition duration-200">
                Book Slot
              </button>
              <button className="w-full px-4 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold transition duration-200">
                View My Crops
              </button>
              <button className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition duration-200">
                Track Status
              </button>
            </div>
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">About Smart Farmer Procurement</h2>
          <p className="text-gray-700 leading-relaxed">
            Welcome to the Smart Farmer Procurement System! This platform helps reduce waiting times 
            at procurement centres and provides real-time queue management. You can:
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
