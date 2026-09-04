import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1";

const cropsAPI = axios.create({
  baseURL: `${API_URL}/crops`,
  headers: {
    "Content-Type": "application/json",
  },
});

cropsAPI.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const getFarmerCrops = async () => {
  try {
    const response = await cropsAPI.get("/");
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        success: false,
        message: "Failed to load crops",
      }
    );
  }
};

export const createCrop = async (cropData) => {
  try {
    const response = await cropsAPI.post("/", cropData);
    return response.data;
  } catch (error) {
    console.error("Create crop error:", error);
    throw (
      error.response?.data || {
        success: false,
        message: error.message || "Failed to create crop",
      }
    );
  }
};

export const updateCrop = async (cropId, cropData) => {
  try {
    const response = await cropsAPI.patch(`/${cropId}`, cropData);
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        success: false,
        message: "Failed to update crop",
      }
    );
  }
};

export const deleteCrop = async (cropId) => {
  try {
    const response = await cropsAPI.delete(`/${cropId}`);
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        success: false,
        message: "Failed to delete crop",
      }
    );
  }
};
