import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1";

const GovernmentCentreDetails = () => {
  const { centreId } = useParams();
  const navigate = useNavigate();

  const [centre, setCentre] = useState(null);
  const [slots, setSlots] = useState([]);
  const [bookings, setBookings] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [activeTab, setActiveTab] = useState("overview");

  const [showSlotModal, setShowSlotModal] = useState(false);
  const [editingSlot, setEditingSlot] = useState(null);
  const [savingSlot, setSavingSlot] = useState(false);

  const [slotForm, setSlotForm] = useState({
    slot_date: "",
    start_time: "09:00",
    end_time: "10:00",
    capacity: 30,
    status: "OPEN",
  });

  // --------------------------------------------------
  // AUTH CONFIG
  // --------------------------------------------------

  const getAuthConfig = () => ({
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });

  // --------------------------------------------------
  // FETCH CENTRE
  // --------------------------------------------------

  const fetchCentre = async () => {
    const response = await axios.get(
      `${API_URL}/centres/${centreId}`,
      getAuthConfig(),
    );

    const data = response.data?.data || response.data;

    setCentre(data);
    setSlots(data?.slots || []);
  };

  // --------------------------------------------------
  // FETCH BOOKINGS
  // --------------------------------------------------

  const fetchBookings = async () => {
    try {
      const response = await axios.get(`${API_URL}/bookings`, {
        params: {
          centreId,
          limit: 100,
        },
        ...getAuthConfig(),
      });

      const data = response.data?.data || response.data?.bookings || [];

      setBookings(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch bookings:", err);
      setBookings([]);
    }
  };

  // --------------------------------------------------
  // LOAD DATA
  // --------------------------------------------------

  const loadCentre = async (showLoader = true) => {
    try {
      if (showLoader) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      setError("");

      await Promise.all([fetchCentre(), fetchBookings()]);
    } catch (err) {
      console.error("Failed to load centre:", err);

      setError(err.response?.data?.message || "Failed to load centre details.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (centreId) {
      loadCentre(true);
    }
  }, [centreId]);

  // --------------------------------------------------
  // STATISTICS
  // --------------------------------------------------

  const stats = useMemo(() => {
    const totalBookings = bookings.length;

    const activeBookings = bookings.filter(
      (booking) =>
        !["CANCELLED", "COMPLETED", "PROCURED"].includes(booking.status),
    ).length;

    const completedBookings = bookings.filter(
      (booking) =>
        booking.status === "COMPLETED" || booking.status === "PROCURED",
    ).length;

    const cancelledBookings = bookings.filter(
      (booking) => booking.status === "CANCELLED",
    ).length;

    const totalSlotCapacity = slots.reduce(
      (sum, slot) => sum + Number(slot.capacity || 0),
      0,
    );

    const bookedSlotCapacity = slots.reduce(
      (sum, slot) => sum + Number(slot.bookedCount || 0),
      0,
    );

    const availableSlotCapacity = Math.max(
      totalSlotCapacity - bookedSlotCapacity,
      0,
    );

    const openSlots = slots.filter((slot) => slot.status === "OPEN").length;

    const closedSlots = slots.filter((slot) => slot.status !== "OPEN").length;

    return {
      totalBookings,
      activeBookings,
      completedBookings,
      cancelledBookings,
      totalSlotCapacity,
      bookedSlotCapacity,
      availableSlotCapacity,
      openSlots,
      closedSlots,
    };
  }, [bookings, slots]);

  // --------------------------------------------------
  // SLOT FORM
  // --------------------------------------------------

  const resetSlotForm = () => {
    setSlotForm({
      slot_date: "",
      start_time: "09:00",
      end_time: "10:00",
      capacity: 30,
      status: "OPEN",
    });

    setEditingSlot(null);
  };

  const handleSlotInput = (event) => {
    const { name, value } = event.target;

    setSlotForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // --------------------------------------------------
  // OPEN CREATE SLOT
  // --------------------------------------------------

  const openCreateSlot = () => {
    resetSlotForm();
    setShowSlotModal(true);
  };

  // --------------------------------------------------
  // OPEN EDIT SLOT
  // --------------------------------------------------

  const openEditSlot = (slot) => {
    setEditingSlot(slot);

    setSlotForm({
      slot_date: slot.slotDate
        ? new Date(slot.slotDate).toISOString().split("T")[0]
        : "",
      start_time: slot.startTime || "09:00",
      end_time: slot.endTime || "10:00",
      capacity: slot.capacity || 30,
      status: slot.status || "OPEN",
    });

    setShowSlotModal(true);
  };

  // --------------------------------------------------
  // SAVE SLOT
  // --------------------------------------------------

  const handleSaveSlot = async (event) => {
    event.preventDefault();

    try {
      setSavingSlot(true);
      setError("");

      if (editingSlot) {
        await axios.patch(
          `${API_URL}/slots/${editingSlot.id}`,
          {
            capacity: Number(slotForm.capacity),
            status: slotForm.status,
          },
          getAuthConfig(),
        );
      } else {
        await axios.post(
          `${API_URL}/centres/${centreId}/slots`,
          {
            slot_date: slotForm.slot_date,
            start_time: slotForm.start_time,
            end_time: slotForm.end_time,
            capacity: Number(slotForm.capacity),
            status: slotForm.status,
          },
          getAuthConfig(),
        );
      }

      setShowSlotModal(false);
      resetSlotForm();

      await loadCentre(false);
    } catch (err) {
      console.error("Failed to save slot:", err);

      setError(err.response?.data?.message || "Failed to save slot.");
    } finally {
      setSavingSlot(false);
    }
  };

  // --------------------------------------------------
  // DELETE SLOT
  // --------------------------------------------------

  const handleDeleteSlot = async (slot) => {
    const confirmed = window.confirm(
      `Delete the slot ${formatSlotTime(slot)}?`,
    );

    if (!confirmed) return;

    try {
      setError("");

      await axios.delete(`${API_URL}/slots/${slot.id}`, getAuthConfig());

      await loadCentre(false);
    } catch (err) {
      console.error("Failed to delete slot:", err);

      setError(err.response?.data?.message || "Failed to delete slot.");
    }
  };

  // --------------------------------------------------
  // TOGGLE CENTRE STATUS
  // --------------------------------------------------

  const toggleCentreStatus = async () => {
    if (!centre) return;

    const newStatus = centre.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";

    const confirmed = window.confirm(
      `${newStatus === "ACTIVE" ? "Activate" : "Deactivate"} ${centre.name}?`,
    );

    if (!confirmed) return;

    try {
      setError("");

      await axios.patch(
        `${API_URL}/centres/${centreId}`,
        {
          status: newStatus,
        },
        getAuthConfig(),
      );

      await loadCentre(false);
    } catch (err) {
      console.error("Failed to update centre:", err);

      setError(
        err.response?.data?.message || "Failed to update centre status.",
      );
    }
  };

  // --------------------------------------------------
  // LOADING
  // --------------------------------------------------

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto" />

          <p className="mt-4 text-gray-600">Loading centre details...</p>
        </div>
      </div>
    );
  }

  // --------------------------------------------------
  // CENTRE NOT FOUND
  // --------------------------------------------------

  if (!centre) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center max-w-md w-full">
          <h2 className="text-xl font-semibold text-gray-900">
            Centre not found
          </h2>

          <p className="text-gray-500 mt-2">
            The procurement centre could not be loaded.
          </p>

          <button
            onClick={() => navigate("/dashboard")}
            className="mt-6 bg-blue-600 text-white px-5 py-2.5 rounded-lg"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <div className="min-h-screen bg-gray-50">
      {/* HEADER */}

      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <button
                onClick={() => navigate("/dashboard")}
                className="text-sm text-blue-600 hover:underline mb-3"
              >
                ← Back to Government Dashboard
              </button>

              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900">
                  {centre.name}
                </h1>

                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    centre.status === "ACTIVE"
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {centre.status}
                </span>
              </div>

              <p className="text-gray-500 mt-1">{centre.centreCode}</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => loadCentre(false)}
                disabled={refreshing}
                className="px-4 py-2.5 border border-gray-300 bg-white rounded-lg font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {refreshing ? "Refreshing..." : "Refresh"}
              </button>

              <button
                onClick={toggleCentreStatus}
                className={`px-4 py-2.5 rounded-lg font-medium ${
                  centre.status === "ACTIVE"
                    ? "bg-red-600 text-white hover:bg-red-700"
                    : "bg-green-600 text-white hover:bg-green-700"
                }`}
              >
                {centre.status === "ACTIVE" ? "Deactivate" : "Activate"}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* ERROR */}

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* CENTRE INFORMATION */}

        <section className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Centre Information
              </h2>

              <p className="text-sm text-gray-500 mt-1">
                Basic details and operating information
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <InfoItem label="Centre Code" value={centre.centreCode} />

            <InfoItem label="District" value={centre.district} />

            <InfoItem label="State" value={centre.state} />

            <InfoItem label="Village" value={centre.village || "—"} />

            <InfoItem label="Address" value={centre.address} />

            <InfoItem
              label="Daily Capacity"
              value={`${centre.dailyCapacity || 0} farmers`}
            />

            <InfoItem label="Opening Time" value={centre.openingTime || "—"} />

            <InfoItem label="Closing Time" value={centre.closingTime || "—"} />
          </div>
        </section>

        {/* STATISTICS */}

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
          <StatCard
            title="Total Bookings"
            value={stats.totalBookings}
            description="All bookings"
          />

          <StatCard
            title="Active Bookings"
            value={stats.activeBookings}
            description="Currently in process"
          />

          <StatCard
            title="Completed"
            value={stats.completedBookings}
            description="Procurement completed"
          />

          <StatCard
            title="Cancelled"
            value={stats.cancelledBookings}
            description="Cancelled bookings"
          />
        </section>

        {/* CAPACITY */}

        <section className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Slot Capacity
              </h2>

              <p className="text-sm text-gray-500 mt-1">
                Current capacity across all configured slots
              </p>
            </div>

            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">
                {stats.bookedSlotCapacity} / {stats.totalSlotCapacity}
              </p>

              <p className="text-sm text-gray-500">bookings / capacity</p>
            </div>
          </div>

          <div className="mt-5">
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all"
                style={{
                  width:
                    stats.totalSlotCapacity > 0
                      ? `${Math.min(
                          (stats.bookedSlotCapacity / stats.totalSlotCapacity) *
                            100,
                          100,
                        )}%`
                      : "0%",
                }}
              />
            </div>

            <div className="flex justify-between mt-2 text-sm">
              <span className="text-gray-500">
                {stats.availableSlotCapacity} remaining
              </span>

              <span className="font-medium text-gray-700">
                {stats.totalSlotCapacity > 0
                  ? Math.round(
                      (stats.bookedSlotCapacity / stats.totalSlotCapacity) *
                        100,
                    )
                  : 0}
                % utilized
              </span>
            </div>
          </div>
        </section>

        {/* TABS */}

        <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="border-b border-gray-200 px-6">
            <div className="flex gap-6">
              <TabButton
                active={activeTab === "overview"}
                onClick={() => setActiveTab("overview")}
              >
                Overview
              </TabButton>

              <TabButton
                active={activeTab === "slots"}
                onClick={() => setActiveTab("slots")}
              >
                Slots ({slots.length})
              </TabButton>

              <TabButton
                active={activeTab === "bookings"}
                onClick={() => setActiveTab("bookings")}
              >
                Bookings ({bookings.length})
              </TabButton>
            </div>
          </div>

          {/* OVERVIEW */}

          {activeTab === "overview" && (
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <MiniStat title="Open Slots" value={stats.openSlots} />

                <MiniStat title="Closed Slots" value={stats.closedSlots} />

                <MiniStat
                  title="Available Capacity"
                  value={stats.availableSlotCapacity}
                />
              </div>

              <div className="mt-8">
                <h3 className="font-semibold text-gray-900">Centre Status</h3>

                <div className="mt-3 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        centre.status === "ACTIVE"
                          ? "bg-green-500"
                          : "bg-gray-400"
                      }`}
                    />

                    <span className="font-medium text-gray-800">
                      {centre.status === "ACTIVE"
                        ? "This centre is operational."
                        : "This centre is currently inactive."}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SLOTS */}

          {activeTab === "slots" && (
            <div>
              <div className="p-6 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-gray-900">
                    Slot Management
                  </h3>

                  <p className="text-sm text-gray-500 mt-1">
                    Create and manage farmer booking slots
                  </p>
                </div>

                <button
                  onClick={openCreateSlot}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-medium"
                >
                  + Add Slot
                </button>
              </div>

              {slots.length === 0 ? (
                <div className="p-10 text-center">
                  <p className="text-gray-500">
                    No slots configured for this centre.
                  </p>

                  <button
                    onClick={openCreateSlot}
                    className="mt-3 text-blue-600 font-medium hover:underline"
                  >
                    Create the first slot
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">
                          Date
                        </th>

                        <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">
                          Time
                        </th>

                        <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">
                          Capacity
                        </th>

                        <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">
                          Booked
                        </th>

                        <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">
                          Status
                        </th>

                        <th className="text-right px-6 py-4 text-sm font-semibold text-gray-700">
                          Actions
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-200">
                      {slots.map((slot) => (
                        <tr key={slot.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            {formatDate(slot.slotDate)}
                          </td>

                          <td className="px-6 py-4">{formatSlotTime(slot)}</td>

                          <td className="px-6 py-4 font-medium">
                            {slot.capacity || 0}
                          </td>

                          <td className="px-6 py-4">{slot.bookedCount || 0}</td>

                          <td className="px-6 py-4">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                slot.status === "OPEN"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {slot.status}
                            </span>
                          </td>

                          <td className="px-6 py-4">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => openEditSlot(slot)}
                                className="px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg"
                              >
                                Edit
                              </button>

                              <button
                                onClick={() => handleDeleteSlot(slot)}
                                className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* BOOKINGS */}

          {activeTab === "bookings" && (
            <div>
              <div className="p-6 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">Centre Bookings</h3>

                <p className="text-sm text-gray-500 mt-1">
                  Farmers currently or previously booked at this centre
                </p>
              </div>

              {bookings.length === 0 ? (
                <div className="p-10 text-center text-gray-500">
                  No bookings found for this centre.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">
                          Booking
                        </th>

                        <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">
                          Farmer
                        </th>

                        <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">
                          Crop
                        </th>

                        <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">
                          Token
                        </th>

                        <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">
                          Status
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-200">
                      {bookings.map((booking) => (
                        <tr key={booking.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <p className="font-medium text-gray-900">
                              {booking.bookingNumber ||
                                booking.booking_number ||
                                "—"}
                            </p>

                            <p className="text-xs text-gray-500 mt-1">
                              {booking.bookedAt
                                ? formatDate(booking.bookedAt)
                                : "—"}
                            </p>
                          </td>

                          <td className="px-6 py-4">
                            {booking.farmer?.user?.name ||
                              booking.farmer?.name ||
                              "—"}
                          </td>

                          <td className="px-6 py-4">
                            {booking.crop?.cropType ||
                              booking.crop?.crop_type ||
                              "—"}
                          </td>

                          <td className="px-6 py-4 font-semibold">
                            {booking.tokenNumber ?? booking.token_number ?? "—"}
                          </td>

                          <td className="px-6 py-4">
                            <BookingStatus status={booking.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </section>
      </main>

      {/* SLOT MODAL */}

      {showSlotModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingSlot ? "Edit Slot" : "Create Slot"}
                </h2>

                <p className="text-sm text-gray-500 mt-1">
                  Configure farmer booking capacity
                </p>
              </div>

              <button
                onClick={() => {
                  setShowSlotModal(false);
                  resetSlotForm();
                }}
                className="text-gray-500 hover:text-gray-800 text-2xl"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveSlot} className="p-6 space-y-5">
              <Input
                label="Date"
                name="slot_date"
                type="date"
                value={slotForm.slot_date}
                onChange={handleSlotInput}
                required={!editingSlot}
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Start Time"
                  name="start_time"
                  type="time"
                  value={slotForm.start_time}
                  onChange={handleSlotInput}
                  required={!editingSlot}
                />

                <Input
                  label="End Time"
                  name="end_time"
                  type="time"
                  value={slotForm.end_time}
                  onChange={handleSlotInput}
                  required={!editingSlot}
                />
              </div>

              <Input
                label="Capacity"
                name="capacity"
                type="number"
                min="1"
                value={slotForm.capacity}
                onChange={handleSlotInput}
                required
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Status
                </label>

                <select
                  name="status"
                  value={slotForm.status}
                  onChange={handleSlotInput}
                  className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 bg-white outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="OPEN">Open</option>
                  <option value="CLOSED">Closed</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowSlotModal(false);
                    resetSlotForm();
                  }}
                  className="px-5 py-2.5 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={savingSlot}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg font-medium"
                >
                  {savingSlot
                    ? "Saving..."
                    : editingSlot
                      ? "Update Slot"
                      : "Create Slot"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// ==================================================
// HELPERS
// ==================================================

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatSlotTime = (slot) => {
  if (slot.startTime && slot.endTime) {
    return `${slot.startTime} - ${slot.endTime}`;
  }

  return "—";
};

// ==================================================
// COMPONENTS
// ==================================================

const StatCard = ({ title, value, description }) => (
  <div className="bg-white border border-gray-200 rounded-xl p-5">
    <p className="text-sm text-gray-500">{title}</p>

    <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>

    <p className="text-sm text-gray-500 mt-1">{description}</p>
  </div>
);

const MiniStat = ({ title, value }) => (
  <div className="border border-gray-200 rounded-lg p-4">
    <p className="text-sm text-gray-500">{title}</p>

    <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
  </div>
);

const InfoItem = ({ label, value }) => (
  <div>
    <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
      {label}
    </p>

    <p className="text-sm font-medium text-gray-900 mt-1">{value || "—"}</p>
  </div>
);

const TabButton = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`py-4 text-sm font-medium border-b-2 transition ${
      active
        ? "border-blue-600 text-blue-600"
        : "border-transparent text-gray-500 hover:text-gray-800"
    }`}
  >
    {children}
  </button>
);

const BookingStatus = ({ status }) => {
  const statusClasses = {
    BOOKED: "bg-blue-100 text-blue-700",
    CONFIRMED: "bg-blue-100 text-blue-700",
    ARRIVED: "bg-yellow-100 text-yellow-700",
    IN_QUEUE: "bg-yellow-100 text-yellow-700",
    CALLED: "bg-purple-100 text-purple-700",
    VERIFICATION: "bg-purple-100 text-purple-700",
    QUALITY_CHECK: "bg-orange-100 text-orange-700",
    WEIGHING: "bg-orange-100 text-orange-700",
    APPROVED: "bg-green-100 text-green-700",
    COMPLETED: "bg-green-100 text-green-700",
    PROCURED: "bg-green-100 text-green-700",
    CANCELLED: "bg-red-100 text-red-700",
  };

  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-semibold ${
        statusClasses[status] || "bg-gray-100 text-gray-600"
      }`}
    >
      {status || "UNKNOWN"}
    </span>
  );
};

const Input = ({
  label,
  name,
  type = "text",
  value,
  onChange,
  required = false,
}) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1.5">
      {label}
    </label>

    <input
      name={name}
      type={type}
      value={value}
      onChange={onChange}
      required={required}
      className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
    />
  </div>
);

export default GovernmentCentreDetails;
