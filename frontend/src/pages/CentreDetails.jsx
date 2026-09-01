import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { ErrorMessage } from "../components/ErrorMessage";

export const CentreDetails = () => {
  const { centreId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [centre, setCentre] = useState(null);
  const [slots, setSlots] = useState([]);
  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedCrop, setSelectedCrop] = useState(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0],
  );

  useEffect(() => {
    fetchCentreDetails();
    fetchCrops();
  }, [centreId]);

  useEffect(() => {
    if (selectedDate) {
      fetchSlots(selectedDate);
    }
  }, [selectedDate]);

  const fetchCentreDetails = async () => {
    try {
      const response = await axios.get(`/api/v1/centres/${centreId}`);
      setCentre(response.data.data || response.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load centre details");
    } finally {
      setLoading(false);
    }
  };

  const fetchSlots = async (date) => {
    try {
      const response = await axios.get(`/api/v1/centres/${centreId}/slots`, {
        params: { date },
      });
      setSlots(response.data.data || response.data);
    } catch (err) {
      console.error("Failed to load slots:", err);
      setSlots([]);
    }
  };

  const fetchCrops = async () => {
    try {
      const response = await axios.get("/api/v1/crops", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const availableCrops = (response.data.data || response.data).filter(
        (crop) => crop.status === "AVAILABLE",
      );
      setCrops(availableCrops);
    } catch (err) {
      console.error("Failed to load crops:", err);
    }
  };

  const handleCreateBooking = async () => {
    if (!selectedCrop || !selectedSlot) {
      alert("Please select both a crop and a time slot");
      return;
    }

    setBookingLoading(true);
    try {
      const response = await axios.post(
        "/api/v1/bookings",
        {
          crop_id: selectedCrop,
          centre_id: centreId,
          slot_id: selectedSlot,
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
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

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Crops & Slots */}
          <div className="lg:col-span-2 space-y-8">
            {/* Select Crop */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                1. Select Your Crop
              </h2>
              {crops.length > 0 ? (
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
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                  <p className="text-yellow-800 font-medium">
                    You don't have any available crops to book.
                  </p>
                  <p className="text-yellow-700 text-sm mt-2">
                    Please add crops first before booking a slot.
                  </p>
                </div>
              )}
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
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              {slots.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {slots.map((slot) => (
                    <div
                      key={slot.id}
                      onClick={() => setSelectedSlot(slot.id)}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition ${
                        selectedSlot === slot.id
                          ? "border-green-600 bg-green-50"
                          : "border-gray-200 hover:border-green-400"
                      } ${slot.bookedCount >= slot.capacity ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      <p className="font-bold text-lg text-gray-800">
                        {slot.startTime} - {slot.endTime}
                      </p>
                      <p className="text-gray-600 text-sm">
                        Capacity: {slot.capacity} | Booked: {slot.bookedCount}
                      </p>
                      <p className="text-gray-600 text-sm">
                        Available: {slot.capacity - slot.bookedCount}
                      </p>
                      {slot.bookedCount >= slot.capacity && (
                        <p className="text-red-600 font-bold mt-2">❌ Full</p>
                      )}
                      {selectedSlot === slot.id && (
                        <p className="text-green-600 font-bold mt-2">
                          ✓ Selected
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
                  <p className="text-blue-800 font-medium">
                    No slots available for{" "}
                    {new Date(selectedDate).toLocaleDateString()}
                  </p>
                  <p className="text-blue-700 text-sm mt-2">
                    Try selecting a different date.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Summary & Booking */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-6 sticky top-4">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">
                Booking Summary
              </h2>

              <div className="space-y-6 border-b pb-6">
                <div>
                  <p className="text-sm text-gray-600 font-medium">CENTRE</p>
                  <p className="font-bold text-lg">{centre.name}</p>
                </div>

                {selectedCrop && (
                  <div>
                    <p className="text-sm text-gray-600 font-medium">CROP</p>
                    <p className="font-bold text-lg">
                      {crops.find((c) => c.id === selectedCrop)?.cropType}
                    </p>
                    <p className="text-gray-700 text-sm">
                      {crops.find((c) => c.id === selectedCrop)?.quantity}{" "}
                      {crops.find((c) => c.id === selectedCrop)?.unit}
                    </p>
                  </div>
                )}

                {selectedSlot && (
                  <div>
                    <p className="text-sm text-gray-600 font-medium">
                      TIME SLOT
                    </p>
                    <p className="font-bold text-lg">
                      {slots.find((s) => s.id === selectedSlot)?.startTime} -{" "}
                      {slots.find((s) => s.id === selectedSlot)?.endTime}
                    </p>
                    <p className="text-gray-700 text-sm">
                      {new Date(selectedDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-6 space-y-3">
                {!selectedCrop && (
                  <p className="text-yellow-600 text-sm flex items-center gap-2">
                    <span>⚠️</span> Please select a crop
                  </p>
                )}
                {!selectedSlot && (
                  <p className="text-yellow-600 text-sm flex items-center gap-2">
                    <span>⚠️</span> Please select a time slot
                  </p>
                )}

                <button
                  onClick={handleCreateBooking}
                  disabled={!selectedCrop || !selectedSlot || bookingLoading}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-3 rounded-lg transition"
                >
                  {bookingLoading ? "Creating Booking..." : "Confirm Booking"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
