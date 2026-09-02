import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import {LoadingSpinner} from "../components/LoadingSpinner";
import {ErrorMessage} from "../components/ErrorMessage";

const CentreManagerDashboard = () => {
  const { centreId } = useParams();
  const [centre, setCentre] = useState(null);
  const [slots, setSlots] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overview"); // overview, slots, bookings, stats
  const [showCreateSlotModal, setShowCreateSlotModal] = useState(false);
  const [editingSlot, setEditingSlot] = useState(null);

  // Form states
  const [slotForm, setSlotForm] = useState({
    slot_date: "",
    start_time: "09:00",
    end_time: "10:00",
    capacity: 30,
  });

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1";

  // Fetch centre details
  const fetchCentreDetails = async () => {
    try {
      const response = await axios.get(`${API_URL}/centres/${centreId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setCentre(response.data.data);
      setSlots(response.data.data.slots || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch centre details");
    }
  };

  // Fetch bookings for the centre
  const fetchBookings = async () => {
    try {
      const response = await axios.get(`${API_URL}/bookings`, {
        params: { centreId, limit: 100 },
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setBookings(response.data.data || []);
    } catch (err) {
      console.error("Failed to fetch bookings:", err);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchCentreDetails();
      await fetchBookings();
      setLoading(false);
    };
    loadData();
  }, [centreId]);

  // Handle create/update slot
  const handleSaveSlot = async (e) => {
    e.preventDefault();
    try {
      if (editingSlot) {
        // Update slot
        await axios.patch(
          `${API_URL}/slots/${editingSlot.id}`,
          {
            capacity: parseInt(slotForm.capacity),
            status: slotForm.status || "OPEN",
          },
          {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          },
        );
      } else {
        // Create slot
        await axios.post(`${API_URL}/centres/${centreId}/slots`, slotForm, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
      }
      setShowCreateSlotModal(false);
      setEditingSlot(null);
      setSlotForm({
        slot_date: "",
        start_time: "09:00",
        end_time: "10:00",
        capacity: 30,
      });
      await fetchCentreDetails();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save slot");
    }
  };

  // Handle delete slot
  const handleDeleteSlot = async (slotId) => {
    if (!window.confirm("Are you sure you want to delete this slot?")) return;
    try {
      await axios.delete(`${API_URL}/slots/${slotId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      await fetchCentreDetails();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete slot");
    }
  };

  // Handle edit slot
  const handleEditSlot = (slot) => {
    setEditingSlot(slot);
    setSlotForm({
      slot_date: slot.slotDate ? new Date(slot.slotDate).toISOString().split("T")[0] : "",
      start_time: slot.startTime || "09:00",
      end_time: slot.endTime || "10:00",
      capacity: slot.capacity,
      status: slot.status || "OPEN",
    });
    setShowCreateSlotModal(true);
  };

  // Calculate statistics
  const calculateStats = () => {
    const totalBookings = bookings.length;
    const confirmedBookings = bookings.filter((b) => b.status === "CONFIRMED").length;
    const procuredCount = bookings.filter((b) => b.status === "PROCURED").length;
    const totalCapacity = slots.reduce((sum, slot) => sum + slot.capacity, 0);
    const bookedCapacity = slots.reduce((sum, slot) => sum + slot.bookedCount, 0);

    return {
      totalBookings,
      confirmedBookings,
      procuredCount,
      totalCapacity,
      bookedCapacity,
      utilizationRate: totalCapacity > 0 ? Math.round((bookedCapacity / totalCapacity) * 100) : 0,
    };
  };

  if (loading) return <LoadingSpinner />;

  const stats = calculateStats();

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {centre?.name || "Centre Manager"}
          </h1>
          <p className="text-gray-600 mt-2">
            {centre?.address} • {centre?.district}, {centre?.state}
          </p>
          <p className="text-sm text-gray-500 mt-1">Code: {centre?.centreCode}</p>
        </div>

        {/* Error Message */}
        {error && <ErrorMessage message={error} onClose={() => setError("")} />}

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 mb-6">
          {[
            { id: "overview", label: "Overview" },
            { id: "slots", label: "Slot Management" },
            { id: "bookings", label: "Bookings" },
            { id: "stats", label: "Statistics" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition ${
                activeTab === tab.id
                  ? "border-green-600 text-green-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}

        {/* Overview Tab */}
        {activeTab === "overview" && centre && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Centre Info */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Centre Information</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <p className="font-medium">
                    <span
                      className={`px-3 py-1 rounded-full text-sm ${
                        centre.status === "ACTIVE"
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {centre.status}
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Daily Capacity</p>
                  <p className="font-medium text-lg">{centre.dailyCapacity} slots</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Operating Hours</p>
                  <p className="font-medium">
                    {centre.openingTime} - {centre.closingTime}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Location</p>
                  <p className="font-medium text-sm">
                    Lat: {parseFloat(centre.latitude).toFixed(4)}, Lon:{" "}
                    {parseFloat(centre.longitude).toFixed(4)}
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Quick Stats</h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Bookings</span>
                  <span className="text-2xl font-bold text-green-600">
                    {stats.totalBookings}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Confirmed</span>
                  <span className="text-2xl font-bold text-blue-600">
                    {stats.confirmedBookings}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Procured</span>
                  <span className="text-2xl font-bold text-purple-600">
                    {stats.procuredCount}
                  </span>
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Capacity Utilization</span>
                    <span className="text-2xl font-bold text-orange-600">
                      {stats.utilizationRate}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Slot Management Tab */}
        {activeTab === "slots" && (
          <div>
            <div className="mb-6">
              <button
                onClick={() => {
                  setEditingSlot(null);
                  setSlotForm({
                    slot_date: "",
                    start_time: "09:00",
                    end_time: "10:00",
                    capacity: 30,
                  });
                  setShowCreateSlotModal(true);
                }}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
              >
                + Create New Slot
              </button>
            </div>

            {/* Slots Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Date</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Time</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Capacity</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Booked</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Available</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">Status</th>
                    <th className="px-6 py-3 text-center text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {slots.length > 0 ? (
                    slots.map((slot) => (
                      <tr key={slot.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm">
                          {new Date(slot.slotDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {slot.startTime} - {slot.endTime}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium">
                          {slot.capacity}
                        </td>
                        <td className="px-6 py-4 text-sm">{slot.bookedCount}</td>
                        <td className="px-6 py-4 text-sm">
                          {slot.capacity - slot.bookedCount}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              slot.status === "OPEN"
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {slot.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center text-sm space-x-2">
                          <button
                            onClick={() => handleEditSlot(slot)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteSlot(slot.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                        No slots created yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Bookings Tab */}
        {activeTab === "bookings" && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold">
                    Booking #
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Farmer</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Crop</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Token</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {bookings.length > 0 ? (
                  bookings.map((booking) => (
                    <tr key={booking.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium">
                        {booking.bookingNumber}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {booking.farmer?.user?.name || "N/A"}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {booking.crop?.cropType || "N/A"}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium">
                        {booking.tokenNumber}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            booking.status === "PROCURED"
                              ? "bg-purple-100 text-purple-800"
                              : booking.status === "CONFIRMED"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {booking.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {new Date(booking.bookedAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                      No bookings found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Statistics Tab */}
        {activeTab === "stats" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Booking Statistics</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Total Bookings:</span>
                  <span className="font-bold">{stats.totalBookings}</span>
                </div>
                <div className="flex justify-between">
                  <span>Confirmed:</span>
                  <span className="font-bold">{stats.confirmedBookings}</span>
                </div>
                <div className="flex justify-between">
                  <span>Procured:</span>
                  <span className="font-bold">{stats.procuredCount}</span>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Capacity Utilization</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Total Capacity:</span>
                  <span className="font-bold">{stats.totalCapacity}</span>
                </div>
                <div className="flex justify-between">
                  <span>Booked:</span>
                  <span className="font-bold">{stats.bookedCapacity}</span>
                </div>
                <div className="flex justify-between">
                  <span>Utilization Rate:</span>
                  <span className="font-bold text-green-600">
                    {stats.utilizationRate}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Slot Modal */}
      {showCreateSlotModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-semibold mb-4">
              {editingSlot ? "Edit Slot" : "Create New Slot"}
            </h2>
            <form onSubmit={handleSaveSlot} className="space-y-4">
              {!editingSlot && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">Date *</label>
                    <input
                      type="date"
                      required
                      value={slotForm.slot_date}
                      onChange={(e) =>
                        setSlotForm({ ...slotForm, slot_date: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Start Time *</label>
                    <input
                      type="time"
                      required
                      value={slotForm.start_time}
                      onChange={(e) =>
                        setSlotForm({ ...slotForm, start_time: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">End Time *</label>
                    <input
                      type="time"
                      required
                      value={slotForm.end_time}
                      onChange={(e) =>
                        setSlotForm({ ...slotForm, end_time: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </>
              )}
              <div>
                <label className="block text-sm font-medium mb-1">Capacity *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={slotForm.capacity}
                  onChange={(e) =>
                    setSlotForm({ ...slotForm, capacity: parseInt(e.target.value) })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div className="flex gap-3 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateSlotModal(false);
                    setEditingSlot(null);
                  }}
                  className="px-4 py-2 text-gray-700 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  {editingSlot ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CentreManagerDashboard;
