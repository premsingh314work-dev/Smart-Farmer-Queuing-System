import React, { useState, useEffect } from "react";
import axios from "axios";

export const BookingHistory = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1";

  const fetchBookings = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_URL}/bookings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBookings(res.data.data || res.data);
    } catch (err) {
      console.error(err);
      setError("Failed to load bookings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleCancel = async (bookingId) => {
    if (!window.confirm("Are you sure you want to cancel this booking? The slot will be freed and your crop will become available again.")) {
      return;
    }
    
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${API_URL}/bookings/${bookingId}/cancel`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert("Booking cancelled successfully.");
      fetchBookings(); // Refresh list
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to cancel booking.");
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "BOOKED": return "bg-blue-100 text-blue-800";
      case "CONFIRMED": return "bg-indigo-100 text-indigo-800";
      case "CANCELLED": return "bg-red-100 text-red-800";
      case "COMPLETED": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading booking history...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Booking History</h1>
        
        {error && <div className="bg-red-100 text-red-700 p-4 rounded mb-4">{error}</div>}

        {bookings.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            You don't have any bookings yet.
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => {
              const canCancel = booking.status === "BOOKED" || booking.status === "CONFIRMED";
              
              return (
                <div key={booking.id} className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-4 mb-4">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-800">{booking.centre?.name || "Unknown Centre"}</h2>
                      <p className="text-sm text-gray-500">Booking #{booking.bookingNumber}</p>
                    </div>
                    <span className={`px-3 py-1 mt-2 md:mt-0 rounded-full text-xs font-bold ${getStatusColor(booking.status)}`}>
                      {booking.status}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Crop Details</p>
                      <p className="font-medium text-gray-900">{booking.crop?.cropType || "Unknown"} - {booking.crop?.quantity} quintals</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Scheduled Slot</p>
                      <p className="font-medium text-gray-900">
                        {new Date(booking.slot?.slotDate).toLocaleDateString()} | {booking.slot?.startTime} - {booking.slot?.endTime}
                      </p>
                    </div>
                  </div>

                  {canCancel && (
                    <div className="mt-6 flex justify-end">
                      <button 
                        onClick={() => handleCancel(booking.id)}
                        className="bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 px-4 py-2 rounded-md text-sm font-medium transition"
                      >
                        Cancel Booking
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
