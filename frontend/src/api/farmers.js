import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1";

const farmersAPI = axios.create({
  baseURL: `${API_URL}/farmers`,
  headers: {
    "Content-Type": "application/json",
  },
});

farmersAPI.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const getFarmerProfile = async () => {
  try {
    const response = await farmersAPI.get("/me");
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        success: false,
        message: "Failed to load farmer profile",
      }
    );
  }
};

export const updateFarmerProfile = async (profileData) => {
  try {
    const response = await farmersAPI.patch("/me", profileData);
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        success: false,
        message: "Failed to update farmer profile",
      }
    );
  }
};
