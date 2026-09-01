import React, { useEffect, useState } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { ErrorMessage } from "../components/ErrorMessage";

export const QueueTracker = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const bookingId = location.state?.bookingId;
  const [queueInfo, setQueueInfo] = useState(null);
  const [bookingDetails, setBookingDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [hasArrived, setHasArrived] = useState(false);

  useEffect(() => {
    if (!bookingId) {
      navigate("/centres");
      return;
    }
    fetchQueueInfo();
    // Refresh queue info every 5 seconds
    const interval = setInterval(fetchQueueInfo, 5000);
    return () => clearInterval(interval);
  }, [bookingId]);

  const fetchQueueInfo = async () => {
    try {
      setRefreshing(true);
      const [queueRes, bookingRes] = await Promise.all([
        axios.get(`/api/v1/queue/booking/${bookingId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }),
        axios.get(`/api/v1/bookings/${bookingId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }),
      ]);

      setQueueInfo(queueRes.data.data || queueRes.data);
      const booking = bookingRes.data.data || bookingRes.data;
      setBookingDetails(booking);
      setHasArrived(
        booking.status === "ARRIVED" || booking.status === "IN_QUEUE",
      );
      setError(null);
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to load queue information",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleMarkArrival = async () => {
    try {
      await axios.post(
        `/api/v1/queue/${bookingId}/arrival`,
        {},
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
      setHasArrived(true);
      fetchQueueInfo();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to mark arrival");
    }
  };

  if (loading) return <LoadingSpinner />;

  if (!queueInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ErrorMessage message={error || "Queue information not found"} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-4">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate("/dashboard")}
          className="mb-6 text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2"
        >
          ← Back to Dashboard
        </button>

        {error && <ErrorMessage message={error} />}

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-blue-800 mb-2">
            Queue Tracker
          </h1>
          <p className="text-gray-600 text-lg">
            Real-time queue position and estimated wait time
          </p>
          {refreshing && (
            <p className="text-blue-600 text-sm mt-2">⟳ Updating...</p>
          )}
        </div>

        {/* Main Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {/* Token Number */}
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <p className="text-gray-600 text-sm font-bold mb-2">TOKEN NUMBER</p>
            <p className="text-5xl font-bold text-blue-600">
              #{queueInfo.tokenNumber}
            </p>
          </div>

          {/* Queue Position */}
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <p className="text-gray-600 text-sm font-bold mb-2">
              QUEUE POSITION
            </p>
            <p className="text-5xl font-bold text-green-600">
              {queueInfo.queuePosition || "—"}
            </p>
          </div>

          {/* People Ahead */}
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <p className="text-gray-600 text-sm font-bold mb-2">PEOPLE AHEAD</p>
            <p className="text-5xl font-bold text-orange-600">
              {queueInfo.peopleAhead ?? queueInfo.queuePosition - 1 ?? "—"}
            </p>
          </div>

          {/* Wait Time */}
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <p className="text-gray-600 text-sm font-bold mb-2">
              EST. WAIT TIME
            </p>
            <p className="text-4xl font-bold text-red-600">
              {queueInfo.estimatedWaitMinutes
                ? `${queueInfo.estimatedWaitMinutes} min`
                : "—"}
            </p>
          </div>
        </div>

        {/* Current Status */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            Current Status
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Booking Info */}
            <div>
              <p className="text-sm text-gray-600 font-bold mb-4">
                BOOKING INFO
              </p>
              <div className="space-y-3">
                <div>
                  <p className="text-gray-600 text-sm">Booking Number</p>
                  <p className="font-bold text-gray-800">
                    {bookingDetails?.bookingNumber}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Status</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-bold text-white ${
                        bookingDetails?.status === "BOOKED"
                          ? "bg-blue-500"
                          : bookingDetails?.status === "ARRIVED"
                            ? "bg-green-500"
                            : bookingDetails?.status === "IN_QUEUE"
                              ? "bg-orange-500"
                              : "bg-gray-500"
                      }`}
                    >
                      {bookingDetails?.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Crop Info */}
            <div>
              <p className="text-sm text-gray-600 font-bold mb-4">CROP INFO</p>
              <div className="space-y-3">
                <div>
                  <p className="text-gray-600 text-sm">Crop Type</p>
                  <p className="font-bold text-gray-800">
                    {bookingDetails?.crop?.cropType}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Quantity</p>
                  <p className="font-bold text-gray-800">
                    {bookingDetails?.crop?.quantity}{" "}
                    {bookingDetails?.crop?.unit}
                  </p>
                </div>
              </div>
            </div>

            {/* Centre Info */}
            <div className="md:col-span-2">
              <p className="text-sm text-gray-600 font-bold mb-4">
                CENTRE INFO
              </p>
              <div className="space-y-3">
                <div>
                  <p className="text-gray-600 text-sm">Centre Name</p>
                  <p className="font-bold text-gray-800">
                    {bookingDetails?.centre?.name}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Address</p>
                  <p className="text-gray-800">
                    {bookingDetails?.centre?.address},{" "}
                    {bookingDetails?.centre?.village}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            Workflow Timeline
          </h2>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white ${
                    bookingDetails?.status === "BOOKED" ||
                    bookingDetails?.status === "ARRIVED" ||
                    bookingDetails?.status === "IN_QUEUE"
                      ? "bg-green-500"
                      : "bg-gray-300"
                  }`}
                >
                  ✓
                </div>
                <div className="w-1 h-12 bg-gray-300"></div>
              </div>
              <div className="pb-4">
                <p className="font-bold text-gray-800">Booking Confirmed</p>
                <p className="text-gray-600 text-sm">
                  {new Date(bookingDetails?.bookedAt).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white ${
                    bookingDetails?.status === "ARRIVED" ||
                    bookingDetails?.status === "IN_QUEUE"
                      ? "bg-green-500"
                      : "bg-gray-300"
                  }`}
                >
                  {bookingDetails?.status === "ARRIVED" ||
                  bookingDetails?.status === "IN_QUEUE"
                    ? "✓"
                    : "2"}
                </div>
                <div className="w-1 h-12 bg-gray-300"></div>
              </div>
              <div className="pb-4">
                <p className="font-bold text-gray-800">Farmer Arrival</p>
                <p className="text-gray-600 text-sm">
                  {hasArrived
                    ? "You have marked your arrival"
                    : "Mark arrival when you reach the centre"}
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white ${
                    bookingDetails?.status === "VERIFICATION" ||
                    bookingDetails?.status === "QUALITY_CHECK" ||
                    bookingDetails?.status === "WEIGHING"
                      ? "bg-green-500"
                      : "bg-gray-300"
                  }`}
                >
                  3
                </div>
                <div className="w-1 h-12 bg-gray-300"></div>
              </div>
              <div className="pb-4">
                <p className="font-bold text-gray-800">Quality Check</p>
                <p className="text-gray-600 text-sm">
                  Operator will inspect your crop
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white ${
                    bookingDetails?.status === "WEIGHING" ||
                    bookingDetails?.status === "PROCURED"
                      ? "bg-green-500"
                      : "bg-gray-300"
                  }`}
                >
                  4
                </div>
              </div>
              <div>
                <p className="font-bold text-gray-800">Weighment & Payment</p>
                <p className="text-gray-600 text-sm">
                  Final weight and payment processing
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action */}
        {!hasArrived && bookingDetails?.status === "BOOKED" && (
          <div className="bg-green-50 border-2 border-green-200 rounded-lg p-8 text-center">
            <h3 className="text-2xl font-bold text-green-800 mb-4">
              Ready to Check In?
            </h3>
            <p className="text-green-700 mb-6">
              Mark your arrival when you reach the procurement centre so we can
              update your position in the queue.
            </p>
            <button
              onClick={handleMarkArrival}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg transition text-lg"
            >
              ✓ Mark Arrival
            </button>
          </div>
        )}

        {hasArrived && (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-8 text-center">
            <h3 className="text-2xl font-bold text-blue-800 mb-4">
              You're Checked In!
            </h3>
            <p className="text-blue-700 mb-2">
              Your arrival has been recorded. The operator will call your token
              number when it's your turn.
            </p>
            <p className="text-blue-600 text-sm">
              Keep checking this page for real-time queue updates.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
