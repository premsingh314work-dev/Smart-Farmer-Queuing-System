import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { ErrorMessage } from "../components/ErrorMessage";

// State and District mapping for India
const STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
  "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal"
];

const DISTRICTS_BY_STATE = {
  "Punjab": ["Amritsar", "Bathinda", "Firozpur", "Gurdaspur", "Jalandhar", "Kapurthala", "Ludhiana", "Mansa", "Moga", "Muktsar", "Patiala", "Sangrur", "Shaheed Bhagat Singh Nagar"],
  "Haryana": ["Ambala", "Bhiwani", "Charkhi Dadri", "Faridabad", "Fatehabad", "Gurugram", "Hisar", "Jind", "Kaithal", "Karnal", "Kurukshetra", "Panipat", "Panchkula", "Rewari", "Rohtak", "Sirsa", "Sonipat", "Yamunanagar"],
  // Add more as needed
};

export const CentreDetails = () => {
  const { centreId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [centre, setCentre] = useState(null);
  const [slots, setSlots] = useState([]);
  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cropsLoading, setCropsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedCrop, setSelectedCrop] = useState(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [selectedState, setSelectedState] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1";

  // Fetch crops with retry logic
  const fetchCrops = useCallback(async (retryCount = 0) => {
    try {
      const token = localStorage.getItem("token");
      
      if (!token) {
        console.error("❌ No token found in localStorage");
        setCrops([]);
        return;
      }

      console.log(`🔄 Fetching crops (attempt ${retryCount + 1})...`);
      
      const response = await axios.get(`${API_URL}/crops`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        timeout: 10000 // 10 second timeout
      });

      console.log("✅ Crops API Response:", response.data);
      
      let cropsData = response.data.data || response.data;
      
      if (!Array.isArray(cropsData)) {
        console.warn("⚠️ Crops data is not array, converting:", cropsData);
        cropsData = cropsData ? [cropsData] : [];
      }

      console.log("📦 Parsed crops array:", cropsData);
      
      // Filter out invalid crops
      const validCrops = cropsData.filter((crop) => {
        const isValid = crop && crop.id;
        console.log(`Checking crop:`, { id: crop?.id, valid: isValid });
        return isValid;
      });

      console.log(`✅ Final valid crops count: ${validCrops.length}`, validCrops);
      
      setCrops(validCrops);
      
      // Auto-select first crop if available
      if (validCrops.length > 0 && !selectedCrop) {
        setSelectedCrop(validCrops[0].id);
        console.log("🎯 Auto-selected first crop:", validCrops[0].id);
      }
      
    } catch (err) {
      console.error("❌ Crop fetch error:", err);
      console.error("Error details:", {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        url: err.config?.url,
      });

      // Retry once after 1 second
      if (retryCount < 2) {
        console.log(`⏳ Retrying in 1s...`);
        setTimeout(() => fetchCrops(retryCount + 1), 1000);
      } else {
        setCrops([]);
      }
    } finally {
      setCropsLoading(false);
    }
  }, [API_URL, selectedCrop]);

  useEffect(() => {
    console.log("🚀 Component mounted, fetching data...");
    fetchCentreDetails();
    
    // Fetch crops with a small delay to ensure token is set
    setCropsLoading(true);
    const timer = setTimeout(() => {
      fetchCrops(0);
    }, 500);

    return () => clearTimeout(timer);
  }, [centreId, fetchCrops]);

  useEffect(() => {
    if (selectedDate) {
      fetchSlots(selectedDate);
    }
  }, [selectedDate]);

  const fetchCentreDetails = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_URL}/centres/${centreId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCentre(response.data.data || response.data);
      setError(null);
    } catch (err) {
      console.error("Fetch centre error:", err);
      setError(err.response?.data?.message || "Failed to load centre details");
    } finally {
      setLoading(false);
    }
  };

  const fetchSlots = async (date) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_URL}/centres/${centreId}/slots`, {
        params: { date },
        headers: { Authorization: `Bearer ${token}` },
      });
      setSlots(response.data.data || response.data);
    } catch (err) {
      console.error("Failed to load slots:", err);
      setSlots([]);
    }
  };

  const handleCreateBooking = async () => {
    if (!selectedCrop || !selectedSlot) {
      alert("Please select both a crop and a time slot");
      return;
    }

    setBookingLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${API_URL}/bookings`,
        {
          crop_id: selectedCrop,
          centre_id: centreId,
          slot_id: selectedSlot,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      const booking = response.data.data || response.data;
      navigate("/booking-confirmation", { state: { booking } });
    } catch (err) {
      alert(err.response?.data?.message || "Failed to create booking");
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  if (!centre) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ErrorMessage message="Centre not found" />
      </div>
    );
  }

  const availableDistricts = selectedState ? (DISTRICTS_BY_STATE[selectedState] || []) : [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white p-4">
      <div className="max-w-6xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate("/centres")}
          className="mb-6 text-green-600 hover:text-green-700 font-medium flex items-center gap-2"
        >
          ← Back to Centres
        </button>

        {error && <ErrorMessage message={error} />}

        {/* Centre Header */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-6">
            <div>
              <h1 className="text-4xl font-bold text-green-800 mb-2">
                {centre.name}
              </h1>
              <p className="text-gray-600 text-lg">{centre.centreCode}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">📍 Location</p>
              <p className="font-medium text-lg">{centre.village}</p>
              <p className="text-gray-700">
                {centre.district}, {centre.state}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">⏰ Operating Hours</p>
              <p className="font-medium text-lg">
                {centre.openingTime} - {centre.closingTime}
              </p>
              <p className="text-green-600 font-bold">
                Status: {centre.status}
              </p>
            </div>
          </div>
          <div className="border-t pt-6">
            <p className="text-gray-700">{centre.address}</p>
          </div>
        </div>

        {/* State & District Selection */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Delivery Location (Optional)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 font-medium mb-2">State</label>
              <select
                value={selectedState}
                onChange={(e) => {
                  setSelectedState(e.target.value);
                  setSelectedDistrict(""); // Reset district
                }}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Select State</option>
                {STATES.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-gray-700 font-medium mb-2">District</label>
              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                disabled={!selectedState}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100"
              >
                <option value="">Select District</option>
                {availableDistricts.map((district) => (
                  <option key={district} value={district}>
                    {district}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Crops & Slots */}
          <div className="lg:col-span-2 space-y-8">
            {/* Select Crop */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                1. Select Your Crop
              </h2>
              {cropsLoading && <LoadingSpinner />}
              {!cropsLoading && crops.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {crops.map((crop) => (
                    <div
                      key={crop.id}
                      onClick={() => setSelectedCrop(crop.id)}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition ${
                        selectedCrop === crop.id
                          ? "border-green-600 bg-green-50"
                          : "border-gray-200 hover:border-green-400"
                      }`}
                    >
                      <p className="font-bold text-lg text-gray-800">
                        {crop.cropType}
                      </p>
                      <p className="text-gray-600 text-sm">
                        Quantity: {crop.quantity} {crop.unit}
                      </p>
                      <p className="text-gray-600 text-sm">
                        Season: {crop.season}
                      </p>
                      {crop.harvestDate && (
                        <p className="text-gray-600 text-sm">
                          Harvested:{" "}
                          {new Date(crop.harvestDate).toLocaleDateString()}
                        </p>
                      )}
                      {selectedCrop === crop.id && (
                        <p className="text-green-600 font-bold mt-2">
                          ✓ Selected
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : !cropsLoading ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                  <p className="text-yellow-800 font-medium mb-2">
                    ⚠️ No crops available to book
                  </p>
                  <p className="text-yellow-700 text-sm mb-4">
                    You need to add crops before booking a slot.
                  </p>
                  <button
                    onClick={() => navigate("/crops/add")}
                    className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition font-medium"
                  >
                    + Add Crop Now
                  </button>
                </div>
              ) : null}
            </div>

            {/* Select Date & Slots */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                2. Select Date & Time Slot
              </h2>

              <div className="mb-6">
                <label className="block text-gray-700 font-medium mb-2">
                  Select Date (Minimum today)
                </label>
                <input
                  type="date"
                  min={new Date().toISOString().split("T")[0]}
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              {slots.length > 0 ? (
                <div className="space-y-2">
                  {slots.map((slot) => (
                    <div
                      key={slot.id}
                      onClick={() => setSelectedSlot(slot.id)}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition ${
                        selectedSlot === slot.id
                          ? "border-green-600 bg-green-50"
                          : "border-gray-200 hover:border-green-400"
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-bold text-gray-800">
                            {slot.start_time} - {slot.end_time}
                          </p>
                          <p className="text-sm text-gray-600">
                            Capacity: {slot.capacity} | Booked: {slot.bookedCount || 0}
                          </p>
                        </div>
                        {selectedSlot === slot.id && (
                          <p className="text-green-600 font-bold">✓</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600">No slots available for this date</p>
              )}
            </div>
          </div>

          {/* Right Column - Booking Summary */}
          <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-lg shadow-md p-6 h-fit">
            <h3 className="text-2xl font-bold text-gray-800 mb-6">
              Booking Summary
            </h3>

            <div className="space-y-4">
              <div className="border-b pb-4">
                <p className="text-sm text-gray-600 mb-1">Centre</p>
                <p className="font-bold text-lg text-gray-800">
                  {centre.name}
                </p>
              </div>

              <div className="border-b pb-4">
                <p className="text-sm text-gray-600 mb-1">Selected Crop</p>
                {selectedCrop ? (
                  <p className="font-bold text-lg text-green-600">
                    {crops.find((c) => c.id === selectedCrop)?.cropType ||
                      "Not selected"}
                  </p>
                ) : (
                  <p className="text-orange-600 font-semibold">
                    ⚠️ Please select a crop
                  </p>
                )}
              </div>

              <div className="border-b pb-4">
                <p className="text-sm text-gray-600 mb-1">Date & Time</p>
                {selectedSlot ? (
                  <p className="font-bold text-lg text-green-600">
                    {new Date(selectedDate).toLocaleDateString()}
                  </p>
                ) : (
                  <p className="text-orange-600 font-semibold">
                    ⚠️ Please select a slot
                  </p>
                )}
              </div>

              <button
                onClick={handleCreateBooking}
                disabled={!selectedCrop || !selectedSlot || bookingLoading}
                className="w-full mt-6 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition font-bold disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {bookingLoading ? "Confirming..." : "Confirm Booking"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
