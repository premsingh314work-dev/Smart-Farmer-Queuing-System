import React, { useEffect, useState } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { ErrorMessage } from "../components/ErrorMessage";

export const BookingConfirmation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const booking = location.state?.booking;
  const [bookingDetails, setBookingDetails] = useState(booking || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!booking?.id) {
      navigate("/centres");
      return;
    }
    fetchBookingDetails();
  }, [booking?.id]);

  const fetchBookingDetails = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/v1/bookings/${booking.id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setBookingDetails(response.data.data || response.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load booking details");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleTrackQueue = () => {
    navigate("/queue-tracker", { state: { bookingId: booking.id } });
  };

  if (loading) return <LoadingSpinner />;

  if (!bookingDetails) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ErrorMessage message={error || "Booking details not found"} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white p-4">
      <div className="max-w-3xl mx-auto">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-4xl font-bold text-green-800 mb-2">
            Booking Confirmed!
          </h1>
          <p className="text-gray-600 text-lg">
            Your crop booking has been successfully created
          </p>
        </div>

        {/* Booking Details Card */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            {/* Booking Number */}
            <div className="col-span-2 bg-green-50 border-2 border-green-200 rounded-lg p-6">
              <p className="text-sm text-green-700 font-bold">BOOKING NUMBER</p>
              <p className="text-3xl font-bold text-green-900 font-mono">
                {bookingDetails.bookingNumber}
              </p>
            </div>

            {/* Token Number */}
            <div className="bg-blue-50 rounded-lg p-6">
              <p className="text-sm text-blue-700 font-bold">
                YOUR TOKEN NUMBER
              </p>
              <p className="text-4xl font-bold text-blue-900">
                #{bookingDetails.tokenNumber}
              </p>
              <p className="text-blue-600 text-sm mt-2">
                You will be called in order based on arrival time
              </p>
            </div>

            {/* Booking Status */}
            <div className="bg-purple-50 rounded-lg p-6">
              <p className="text-sm text-purple-700 font-bold">STATUS</p>
              <p className="text-2xl font-bold text-purple-900 mt-2">
                {bookingDetails.status}
              </p>
              <p className="text-purple-600 text-sm mt-2">
                Booked on{" "}
                {new Date(bookingDetails.bookedAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Details */}
          <div className="border-t pt-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              Booking Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <p className="text-sm text-gray-600 font-bold">CENTRE</p>
                <p className="font-bold text-lg text-gray-800 mt-2">
                  {bookingDetails.centre?.name}
                </p>
                <p className="text-gray-600 text-sm mt-1">
                  {bookingDetails.centre?.village},{" "}
                  {bookingDetails.centre?.district}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-600 font-bold">CROP</p>
                <p className="font-bold text-lg text-gray-800 mt-2">
                  {bookingDetails.crop?.cropType}
                </p>
                <p className="text-gray-600 text-sm mt-1">
                  {bookingDetails.crop?.quantity} {bookingDetails.crop?.unit}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-600 font-bold">SLOT TIME</p>
                <p className="font-bold text-lg text-gray-800 mt-2">
                  {bookingDetails.slot?.startTime} -{" "}
                  {bookingDetails.slot?.endTime}
                </p>
                <p className="text-gray-600 text-sm mt-1">
                  {new Date(bookingDetails.slot?.slotDate).toLocaleDateString()}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-600 font-bold">HARVEST DATE</p>
                <p className="font-bold text-lg text-gray-800 mt-2">
                  {bookingDetails.crop?.harvestDate
                    ? new Date(
                        bookingDetails.crop.harvestDate,
                      ).toLocaleDateString()
                    : "Not specified"}
                </p>
              </div>
            </div>
          </div>

          {/* Next Steps */}
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 mt-8">
            <h3 className="font-bold text-yellow-900 mb-3">📋 What's Next?</h3>
            <ul className="space-y-2 text-yellow-800">
              <li className="flex items-start gap-3">
                <span className="font-bold">1.</span>
                <span>
                  Keep your token number safe - you'll need it at the centre
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="font-bold">2.</span>
                <span>Arrive at the centre before your booked time slot</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="font-bold">3.</span>
                <span>Check your queue position and estimated wait time</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="font-bold">4.</span>
                <span>Complete the quality check and weighment process</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="font-bold">5.</span>
                <span>Receive payment for your crop</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={handleTrackQueue}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg transition flex items-center justify-center gap-2"
          >
            📍 Track Queue Position
          </button>
          <button
            onClick={handlePrint}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg transition flex items-center justify-center gap-2"
          >
            🖨️ Print Confirmation
          </button>
          <button
            onClick={() => navigate("/dashboard")}
            className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-8 rounded-lg transition flex items-center justify-center gap-2"
          >
            ↩️ Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};
