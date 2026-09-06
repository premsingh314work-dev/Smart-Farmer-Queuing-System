import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getFarmerProfile, updateFarmerProfile } from "../api/farmers";
import { INDIAN_STATES, DISTRICTS_BY_STATE } from "../constants/cropData";

export const FarmerProfile = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [profile, setProfile] = useState({
    name: "",
    phone: "",
    email: "",
    village: "",
    district: "",
    state: "",
    preferredLanguage: "en",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await getFarmerProfile();
        if (response?.success) {
          setProfile({
            name: response.user?.name || user?.name || "",
            phone: response.user?.phone || user?.phone || "",
            email: response.user?.email || "",
            village: response.farmer?.village || "",
            district: response.farmer?.district || "",
            state: response.farmer?.state || "",
            preferredLanguage: response.farmer?.preferredLanguage || "en",
          });
        }
      } catch (error) {
        console.error("Failed to load farmer profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => {
      const updated = { ...prev, [name]: value };
      // Reset district when state changes
      if (name === "state") {
        updated.district = "";
      }
      return updated;
    });
  };

  const handleSave = async () => {
    try {
      const response = await updateFarmerProfile({
        name: profile.name,
        email: profile.email,
        village: profile.village,
        district: profile.district,
        state: profile.state,
        preferred_language: profile.preferredLanguage,
      });

      if (response?.success) {
        alert("Profile updated successfully");
      }
    } catch (error) {
      alert(error?.message || "Unable to update profile");
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-green-50 text-green-700 font-semibold">
        Loading profile...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 p-4 sm:p-6">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <div>
              <p className="text-sm uppercase tracking-wide text-green-700 font-semibold">
                Farmer profile
              </p>
              <h1 className="text-3xl font-bold text-gray-900 mt-2">
                My Profile
              </h1>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => navigate("/dashboard")}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Back to dashboard
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-white rounded-lg shadow-md p-6">
            <div className="flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-3xl font-bold mb-4">
                {profile.name?.charAt(0)?.toUpperCase() || "F"}
              </div>
              <h2 className="text-xl font-bold text-gray-900">
                {profile.name}
              </h2>
              <p className="text-sm text-gray-500 mt-1">Farmer</p>
            </div>

            <div className="mt-6 space-y-3 text-sm text-gray-700">
              <div className="flex justify-between border-b pb-2">
                <span>Phone</span>
                <span className="font-medium">{profile.phone}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span>Village</span>
                <span className="font-medium">{profile.village}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span>District</span>
                <span className="font-medium">{profile.district}</span>
              </div>
              <div className="flex justify-between">
                <span>State</span>
                <span className="font-medium">{profile.state}</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              Edit Profile
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={profile.name}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={profile.phone}
                  disabled
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={profile.email}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Preferred Language
                </label>
                <select
                  name="preferredLanguage"
                  value={profile.preferredLanguage}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="en">English</option>
                  <option value="hi">Hindi</option>
                  <option value="mr">Marathi</option>
                  <option value="pa">Punjabi</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Village
                </label>
                <input
                  type="text"
                  name="village"
                  value={profile.village}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  District
                </label>
                <select
                  name="district"
                  value={profile.district}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">
                    {profile.state
                      ? "Select your district"
                      : "Please select state first"}
                  </option>
                  {profile.state &&
                    DISTRICTS_BY_STATE[profile.state]?.map((district) => (
                      <option key={district} value={district}>
                        {district}
                      </option>
                    ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  State
                </label>
                <select
                  name="state"
                  value={profile.state}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Select your state</option>
                  {INDIAN_STATES.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={handleSave}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
