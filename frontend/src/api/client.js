import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1";

const getToken = () => localStorage.getItem("token");

const apiClient = axios.create({
  baseURL: API_URL,
});

// Add auth header to all requests
apiClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Centres API
export const centresAPI = {
  list: (filters) =>
    apiClient.get("/centres", { params: filters }),
  get: (id) =>
    apiClient.get(`/centres/${id}`),
  getAvailability: (id) =>
    apiClient.get(`/centres/${id}/availability`),
  create: (data) =>
    apiClient.post("/centres", data),
  update: (id, data) =>
    apiClient.patch(`/centres/${id}`, data),
};

// Recommendations API
export const recommendationsAPI = {
  getCentres: (latitude, longitude, radius = 50, date = null) =>
    apiClient.get("/recommendations/centres", {
      params: { latitude, longitude, radius, ...(date && { date }) },
    }),
  getSlots: (centreId, date) =>
    apiClient.get("/recommendations/slots", {
      params: { centreId, date },
    }),
};

// Slots API
export const slotsAPI = {
  list: (centreId, date) =>
    apiClient.get(`/centres/${centreId}/slots`, {
      params: { ...(date && { date }) },
    }),
  create: (centreId, data) =>
    apiClient.post(`/centres/${centreId}/slots`, data),
  update: (id, data) =>
    apiClient.patch(`/slots/${id}`, data),
  delete: (id) =>
    apiClient.delete(`/slots/${id}`),
};

// Bookings API
export const bookingsAPI = {
  list: (filters) =>
    apiClient.get("/bookings", { params: filters }),
  get: (id) =>
    apiClient.get(`/bookings/${id}`),
  create: (data) =>
    apiClient.post("/bookings", data),
  cancel: (id, reason) =>
    apiClient.post(`/bookings/${id}/cancel`, { cancellation_reason: reason }),
};

// Queue API
export const queueAPI = {
  getPosition: (bookingId) =>
    apiClient.get(`/bookings/${bookingId}/queue`),
  markArrival: (bookingId) =>
    apiClient.post(`/bookings/${bookingId}/arrival`),
  callNext: (centreId) =>
    apiClient.post(`/queue/${centreId}/call-next`),
  markNoShow: (bookingId) =>
    apiClient.post(`/queue/${bookingId}/no-show`),
};

// Procurement API
export const procurementAPI = {
  start: (bookingId) =>
    apiClient.post(`/procurements/${bookingId}/start`),
  quality: (bookingId, data) =>
    apiClient.post(`/procurements/${bookingId}/quality`, data),
  weighment: (bookingId, data) =>
    apiClient.post(`/procurements/${bookingId}/weighment`, data),
  complete: (bookingId) =>
    apiClient.post(`/procurements/${bookingId}/complete`),
  get: (bookingId) =>
    apiClient.get(`/procurements/${bookingId}`),
};

// Crops API
export const cropsAPI = {
  list: () =>
    apiClient.get("/crops"),
  get: (id) =>
    apiClient.get(`/crops/${id}`),
  create: (data) =>
    apiClient.post("/crops", data),
  update: (id, data) =>
    apiClient.patch(`/crops/${id}`, data),
  delete: (id) =>
    apiClient.delete(`/crops/${id}`),
};

// Farmer API
export const farmerAPI = {
  getProfile: () =>
    apiClient.get("/farmers/me"),
  updateProfile: (data) =>
    apiClient.patch("/farmers/me", data),
};

// Auth API
export const authAPI = {
  register: (data) =>
    apiClient.post("/auth/register", data),
  login: (phone, password) =>
    apiClient.post("/auth/login", { phone, password }),
  logout: () =>
    apiClient.post("/auth/logout"),
  getMe: () =>
    apiClient.get("/auth/me"),
};

export default apiClient;
