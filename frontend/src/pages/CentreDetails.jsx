import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { ErrorMessage } from "../components/ErrorMessage";

// State and District mapping for India
const STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
];

const DISTRICTS_BY_STATE = {
  Punjab: [
    "Amritsar",
    "Bathinda",
    "Firozpur",
    "Gurdaspur",
    "Jalandhar",
    "Kapurthala",
    "Ludhiana",
    "Mansa",
    "Moga",
    "Muktsar",
    "Patiala",
    "Sangrur",
    "Shaheed Bhagat Singh Nagar",
  ],

  Haryana: [
    "Ambala",
    "Bhiwani",
    "Charkhi Dadri",
    "Faridabad",
    "Fatehabad",
    "Gurugram",
    "Hisar",
    "Jind",
    "Kaithal",
    "Karnal",
    "Kurukshetra",
    "Panipat",
    "Panchkula",
    "Rewari",
    "Rohtak",
    "Sirsa",
    "Sonipat",
    "Yamunanagar",
  ],

  // Add more states/districts as needed
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

  // Backend is running on port 8000
  const API_URL = import.meta.env.VITE_API_URL;

  // =========================================================
  // FETCH FARMER CROPS
  // =========================================================
  const fetchCrops = useCallback(
    async (retryCount = 0) => {
      try {
        setCropsLoading(true);

        const token = localStorage.getItem("token");

        if (!token) {
          console.error("❌ No token found in localStorage");
          setCrops([]);
          return;
        }

        console.log(`🔄 Fetching farmer crops (attempt ${retryCount + 1})...`);

        const response = await axios.get(`${API_URL}/crops`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          timeout: 10000,
        });

        console.log("✅ Crops API Response:", response.data);

        // IMPORTANT:
        // Backend response is:
        // {
        //   success: true,
        //   crops: [...]
        // }
        const cropsData = response.data.crops || [];

        console.log("📦 Parsed crops array:", cropsData);

        // Keep only valid crop objects
        const validCrops = cropsData.filter((crop) => crop && crop.id);

        console.log(
          `✅ Final valid crops count: ${validCrops.length}`,
          validCrops,
        );

        const availableCrops = validCrops.filter(
          (crop) => !crop.isBooked && crop.status === "AVAILABLE",
        );

        setCrops(availableCrops);

        // Automatically select the first crop
        // if no crop is currently selected.
        if (validCrops.length > 0) {
          setSelectedCrop((previousCrop) => {
            // Keep existing selection if it still exists
            const stillExists = validCrops.some(
              (crop) => crop.id === previousCrop,
            );

            if (stillExists) {
              return previousCrop;
            }

            console.log("🎯 Auto-selected first crop:", validCrops[0].id);

            return validCrops[0].id;
          });
        }
      } catch (err) {
        console.error("❌ Crop fetch error:", err);

        console.error("Error details:", {
          message: err.message,
          response: err.response?.data,
          status: err.response?.status,
          url: err.config?.url,
        });

        // Retry up to 2 times
        if (retryCount < 2) {
          console.log("⏳ Retrying crop fetch in 1 second...");

          setTimeout(() => {
            fetchCrops(retryCount + 1);
          }, 1000);
        } else {
          setCrops([]);
        }
      } finally {
        setCropsLoading(false);
      }
    },
    [API_URL],
  );

  // =========================================================
  // INITIAL DATA LOAD
  // =========================================================
  useEffect(() => {
    console.log("🚀 CentreDetails mounted");
    console.log("Centre ID:", centreId);
    console.log("Logged-in user:", user);

    fetchCentreDetails();

    // Small delay to make sure authentication token
    // is available in localStorage.
    setCropsLoading(true);

    const timer = setTimeout(() => {
      fetchCrops(0);
    }, 500);

    return () => clearTimeout(timer);
  }, [centreId, fetchCrops]);

  // =========================================================
  // FETCH SLOTS WHEN DATE CHANGES
  // =========================================================
  useEffect(() => {
    if (selectedDate) {
      fetchSlots(selectedDate);
    }
  }, [selectedDate]);

  // =========================================================
  // FETCH CENTRE DETAILS
  // =========================================================
  const fetchCentreDetails = async () => {
    try {
      const token = localStorage.getItem("token");

      const response = await axios.get(`${API_URL}/centres/${centreId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("✅ Centre response:", response.data);

      setCentre(response.data.data || response.data);
      setError(null);
    } catch (err) {
      console.error("❌ Fetch centre error:", err);

      setError(err.response?.data?.message || "Failed to load centre details");
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // FETCH SLOTS
  // =========================================================
  const fetchSlots = async (date) => {
    try {
      const token = localStorage.getItem("token");

      const response = await axios.get(`${API_URL}/centres/${centreId}/slots`, {
        params: {
          date,
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("✅ Slots response:", response.data);

      setSlots(response.data.data || response.data);
    } catch (err) {
      console.error("❌ Failed to load slots:", err);

      setSlots([]);
    }
  };

  // =========================================================
  // CREATE BOOKING
  // =========================================================
  const handleCreateBooking = async () => {
    if (!selectedCrop || !selectedSlot) {
      alert("Please select both a crop and a time slot");
      return;
    }

    setBookingLoading(true);

    try {
      const token = localStorage.getItem("token");

      console.log("📤 Creating booking:", {
        crop_id: selectedCrop,
        centre_id: centreId,
        slot_id: selectedSlot,
      });

      const response = await axios.post(
        `${API_URL}/bookings`,
        {
          crop_id: selectedCrop,
          centre_id: centreId,
          slot_id: selectedSlot,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      console.log("✅ Booking created:", response.data);

      const booking = response.data.data || response.data;

      navigate("/booking-confirmation", {
        state: {
          booking,
        },
      });
    } catch (err) {
      console.error("❌ Booking creation error:", err);

      alert(err.response?.data?.message || "Failed to create booking");
    } finally {
      setBookingLoading(false);
    }
  };

  // =========================================================
  // LOADING STATE
  // =========================================================
  if (loading) {
    return <LoadingSpinner />;
  }

  // =========================================================
  // CENTRE NOT FOUND
  // =========================================================
  if (!centre) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ErrorMessage message="Centre not found" />
      </div>
    );
  }

  // =========================================================
  // DISTRICTS
  // =========================================================
  const availableDistricts = selectedState
    ? DISTRICTS_BY_STATE[selectedState] || []
    : [];

  // =========================================================
  // UI
  // =========================================================
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white p-4">
      <div className="max-w-6xl mx-auto">
        {/* =====================================================
            BACK BUTTON
        ====================================================== */}
        <button
          onClick={() => navigate("/centres")}
          className="mb-6 text-green-600 hover:text-green-700 font-medium flex items-center gap-2"
        >
          ← Back to Centres
        </button>

        {error && <ErrorMessage message={error} />}

        {/* =====================================================
            CENTRE HEADER
        ====================================================== */}
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

        {/* =====================================================
            MAIN CONTENT
        ====================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ===================================================
              LEFT COLUMN
          ==================================================== */}
          <div className="lg:col-span-2 space-y-8">
            {/* =================================================
                SELECT CROP
            ================================================== */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                1. Select Your Crop
              </h2>

              {/* Loading */}
              {cropsLoading && <LoadingSpinner />}

              {/* Crops available */}
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
                /* No crops */
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

            {/* =================================================
                DATE & SLOTS
            ================================================== */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                2. Select Date & Time Slot
              </h2>

              {/* Date */}
              <div className="mb-6">
                <label className="block text-gray-700 font-medium mb-2">
                  Select Date (Up to 15 days ahead)
                </label>

                <input
                  type="date"
                  min={new Date().toISOString().split("T")[0]}
                  max={(() => {
                    const maxDate = new Date();
                    maxDate.setDate(maxDate.getDate() + 15);
                    return maxDate.toISOString().split("T")[0];
                  })()}
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              {/* Slots */}
              {slots.length > 0 ? (
                <div className="space-y-4">
                  {slots.every(s => s.bookedCount >= s.capacity) && (
                    <div className="bg-red-50 text-red-700 p-3 rounded text-sm font-medium border border-red-200">
                      ⚠️ No slots available for this date. All capacity has been booked.
                    </div>
                  )}
                  <div className="space-y-2">
                    {slots.map((slot) => {
                      const isFull = slot.bookedCount >= slot.capacity;
                      return (
                        <div
                          key={slot.id}
                          onClick={() => !isFull && setSelectedSlot(slot.id)}
                          className={`p-4 border-2 rounded-lg transition ${
                            isFull 
                              ? "border-gray-200 bg-gray-100 cursor-not-allowed opacity-70"
                              : selectedSlot === slot.id
                                ? "border-green-600 bg-green-50 cursor-pointer"
                                : "border-gray-200 hover:border-green-400 cursor-pointer"
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <p className={`font-bold ${isFull ? 'text-gray-500' : 'text-gray-800'}`}>
                                {slot.startTime} - {slot.endTime}
                              </p>
                              
                              <p className={`text-sm ${isFull ? 'text-gray-400' : 'text-gray-600'}`}>
                                Capacity: {slot.capacity} | Booked: {slot.bookedCount || 0}
                              </p>
                            </div>

                            {selectedSlot === slot.id && !isFull && (
                              <p className="text-green-600 font-bold">✓</p>
                            )}
                            {isFull && (
                              <p className="text-gray-400 font-bold text-sm uppercase">Full</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className="text-gray-500">No slots generated for this date</p>
              )}
            </div>
          </div>

          {/* ===================================================
              BOOKING SUMMARY
          ==================================================== */}
          <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-lg shadow-md p-6 h-fit">
            <h3 className="text-2xl font-bold text-gray-800 mb-6">
              Booking Summary
            </h3>

            <div className="space-y-4">
              {/* Centre */}
              <div className="border-b pb-4">
                <p className="text-sm text-gray-600 mb-1">Centre</p>

                <p className="font-bold text-lg text-gray-800">{centre.name}</p>
              </div>

              {/* Selected Crop */}
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

              {/* Date & Time */}
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

              {/* Confirm Booking */}
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
