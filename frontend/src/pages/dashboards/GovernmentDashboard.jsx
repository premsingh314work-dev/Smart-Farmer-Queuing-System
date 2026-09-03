import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { getToken } from "../../api/auth";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1";

const GovernmentDashboard = () => {
  const navigate = useNavigate();

  const [centres, setCentres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    centreCode: "",
    address: "",
    village: "",
    district: "",
    state: "",
    latitude: "",
    longitude: "",
    dailyCapacity: "",
    openingTime: "09:00",
    closingTime: "17:00",
  });

  // --------------------------------------------------
  // FETCH ALL CENTRES
  // --------------------------------------------------

  const fetchCentres = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await axios.get(`${API_URL}/centres`);

      const data = response.data?.data || response.data?.centres || [];

      setCentres(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch centres:", err);

      setError(
        err.response?.data?.message || "Unable to load procurement centres.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCentres();
  }, []);

  // --------------------------------------------------
  // STATISTICS
  // --------------------------------------------------

  const statistics = useMemo(() => {
    const total = centres.length;

    const active = centres.filter(
      (centre) => centre.status === "ACTIVE",
    ).length;

    const inactive = centres.filter(
      (centre) => centre.status !== "ACTIVE",
    ).length;

    const capacity = centres.reduce(
      (sum, centre) => sum + Number(centre.dailyCapacity || 0),
      0,
    );

    const totalBookings = centres.reduce(
      (sum, centre) =>
        sum +
        Number(
          centre.bookings?.length ||
            centre.currentBookings ||
            centre.todayBookings ||
            0,
        ),
      0,
    );

    const totalQueue = centres.reduce(
      (sum, centre) =>
        sum +
        Number(
          centre.queueEntries?.length ||
            centre.currentQueueLength ||
            centre.queueLength ||
            0,
        ),
      0,
    );

    return {
      total,
      active,
      inactive,
      capacity,
      totalBookings,
      totalQueue,
    };
  }, [centres]);

  // --------------------------------------------------
  // FILTER CENTRES
  // --------------------------------------------------

  const filteredCentres = useMemo(() => {
    return centres.filter((centre) => {
      const searchValue = search.toLowerCase().trim();

      const matchesSearch =
        !searchValue ||
        centre.name?.toLowerCase().includes(searchValue) ||
        centre.centreCode?.toLowerCase().includes(searchValue) ||
        centre.district?.toLowerCase().includes(searchValue) ||
        centre.state?.toLowerCase().includes(searchValue);

      const matchesStatus =
        statusFilter === "ALL" || centre.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [centres, search, statusFilter]);

  // --------------------------------------------------
  // FORM HANDLING
  // --------------------------------------------------

  const handleInputChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const resetForm = () => {
    setFormData({
      name: "",
      centreCode: "",
      address: "",
      village: "",
      district: "",
      state: "",
      latitude: "",
      longitude: "",
      dailyCapacity: "",
      openingTime: "09:00",
      closingTime: "17:00",
    });
  };

  // --------------------------------------------------
  // CREATE CENTRE
  // --------------------------------------------------

  const handleCreateCentre = async (event) => {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");

      const payload = {
        name: formData.name.trim(),
        centreCode: formData.centreCode.trim(),
        address: formData.address.trim(),
        village: formData.village.trim() || undefined,
        district: formData.district.trim(),
        state: formData.state.trim(),
        latitude: Number(formData.latitude),
        longitude: Number(formData.longitude),
        dailyCapacity: Number(formData.dailyCapacity),
        openingTime: formData.openingTime,
        closingTime: formData.closingTime,
      };

      await axios.post(`${API_URL}/centres`, payload);

      setShowAddModal(false);
      resetForm();

      await fetchCentres();
    } catch (err) {
      console.error("Failed to create centre:", err);

      setError(
        err.response?.data?.message || "Unable to create procurement centre.",
      );
    } finally {
      setSaving(false);
    }
  };

  // --------------------------------------------------
  // TOGGLE CENTRE STATUS
  // --------------------------------------------------

  const toggleCentreStatus = async (centre) => {
    const newStatus = centre.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";

    const confirmed = window.confirm(
      `${newStatus === "ACTIVE" ? "Activate" : "Deactivate"} ${centre.name}?`,
    );

    if (!confirmed) return;

    try {
      setError("");

      const token = getToken();

      await axios.patch(
        `${API_URL}/centres/${centre.id}`,
        {
          status: newStatus,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      await fetchCentres();
    } catch (err) {
      console.error("Failed to update centre:", err);

      setError(
        err.response?.data?.message || "Unable to update centre status.",
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

          <p className="mt-4 text-gray-600">Loading government dashboard...</p>
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
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Government Dashboard
              </h1>

              <p className="text-gray-500 mt-1">
                Monitor and manage procurement centres
              </p>
            </div>

            <button
              onClick={() => setShowAddModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium transition"
            >
              + Add Centre
            </button>
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

        {/* STATISTICS */}

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          <StatCard
            title="Total Centres"
            value={statistics.total}
            description="Registered procurement centres"
          />

          <StatCard
            title="Active Centres"
            value={statistics.active}
            description="Currently operational"
          />

          <StatCard
            title="Inactive Centres"
            value={statistics.inactive}
            description="Currently unavailable"
          />

          <StatCard
            title="Daily Capacity"
            value={statistics.capacity}
            description="Total farmer capacity"
          />
        </section>

        {/* SYSTEM ACTIVITY */}

        <section className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <p className="text-sm text-gray-500">Today's Bookings</p>

            <p className="text-3xl font-bold text-gray-900 mt-2">
              {statistics.totalBookings}
            </p>

            <p className="text-sm text-gray-500 mt-1">Across all centres</p>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <p className="text-sm text-gray-500">Farmers in Queue</p>

            <p className="text-3xl font-bold text-gray-900 mt-2">
              {statistics.totalQueue}
            </p>

            <p className="text-sm text-gray-500 mt-1">Current queue entries</p>
          </div>
        </section>

        {/* CENTRE MANAGEMENT */}

        <section className="bg-white border border-gray-200 rounded-xl">
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Procurement Centres
                </h2>

                <p className="text-sm text-gray-500 mt-1">
                  Manage all registered centres
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                {/* SEARCH */}

                <input
                  type="text"
                  placeholder="Search centre..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="border border-gray-300 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                />

                {/* STATUS */}

                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="border border-gray-300 rounded-lg px-4 py-2 bg-white outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ALL">All Status</option>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          {/* TABLE */}

          {filteredCentres.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-500">No procurement centres found.</p>

              {centres.length === 0 && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="mt-4 text-blue-600 font-medium hover:underline"
                >
                  Add your first centre
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">
                      Centre
                    </th>

                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">
                      Location
                    </th>

                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">
                      Capacity
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
                  {filteredCentres.map((centre) => (
                    <tr key={centre.id} className="hover:bg-gray-50">
                      {/* CENTRE */}

                      <td className="px-6 py-5">
                        <div>
                          <p className="font-semibold text-gray-900">
                            {centre.name}
                          </p>

                          <p className="text-sm text-gray-500 mt-1">
                            {centre.centreCode}
                          </p>
                        </div>
                      </td>

                      {/* LOCATION */}

                      <td className="px-6 py-5">
                        <p className="text-gray-800">{centre.district}</p>

                        <p className="text-sm text-gray-500">{centre.state}</p>
                      </td>

                      {/* CAPACITY */}

                      <td className="px-6 py-5">
                        <p className="font-medium text-gray-900">
                          {centre.dailyCapacity || 0}
                        </p>

                        <p className="text-sm text-gray-500">farmers/day</p>
                      </td>

                      {/* STATUS */}

                      <td className="px-6 py-5">
                        <span
                          className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
                            centre.status === "ACTIVE"
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {centre.status || "UNKNOWN"}
                        </span>
                      </td>

                      {/* ACTIONS */}

                      <td className="px-6 py-5">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() =>
                              navigate(`/government/centre/${centre.id}`)
                            }
                            className="px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg"
                          >
                            Manage
                          </button>

                          <button
                            onClick={() => toggleCentreStatus(centre)}
                            className={`px-3 py-2 text-sm font-medium rounded-lg ${
                              centre.status === "ACTIVE"
                                ? "text-red-600 hover:bg-red-50"
                                : "text-green-600 hover:bg-green-50"
                            }`}
                          >
                            {centre.status === "ACTIVE"
                              ? "Deactivate"
                              : "Activate"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {/* ADD CENTRE MODAL */}

      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Add Procurement Centre
                </h2>

                <p className="text-sm text-gray-500 mt-1">
                  Create a new centre
                </p>
              </div>

              <button
                onClick={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
                className="text-gray-500 hover:text-gray-800 text-2xl"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateCentre} className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Centre Name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />

                <Input
                  label="Centre Code"
                  name="centreCode"
                  value={formData.centreCode}
                  onChange={handleInputChange}
                  required
                />

                <Input
                  label="Address"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  required
                />

                <Input
                  label="Village"
                  name="village"
                  value={formData.village}
                  onChange={handleInputChange}
                />

                <Input
                  label="District"
                  name="district"
                  value={formData.district}
                  onChange={handleInputChange}
                  required
                />

                <Input
                  label="State"
                  name="state"
                  value={formData.state}
                  onChange={handleInputChange}
                  required
                />

                <Input
                  label="Latitude"
                  name="latitude"
                  type="number"
                  step="any"
                  value={formData.latitude}
                  onChange={handleInputChange}
                  required
                />

                <Input
                  label="Longitude"
                  name="longitude"
                  type="number"
                  step="any"
                  value={formData.longitude}
                  onChange={handleInputChange}
                  required
                />

                <Input
                  label="Daily Capacity"
                  name="dailyCapacity"
                  type="number"
                  min="1"
                  value={formData.dailyCapacity}
                  onChange={handleInputChange}
                  required
                />

                <Input
                  label="Opening Time"
                  name="openingTime"
                  type="time"
                  value={formData.openingTime}
                  onChange={handleInputChange}
                  required
                />

                <Input
                  label="Closing Time"
                  name="closingTime"
                  type="time"
                  value={formData.closingTime}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                  className="px-5 py-2.5 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg font-medium"
                >
                  {saving ? "Creating..." : "Create Centre"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// --------------------------------------------------
// STAT CARD
// --------------------------------------------------

const StatCard = ({ title, value, description }) => {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <p className="text-sm text-gray-500">{title}</p>

      <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>

      <p className="text-sm text-gray-500 mt-1">{description}</p>
    </div>
  );
};

// --------------------------------------------------
// INPUT
// --------------------------------------------------

const Input = ({
  label,
  name,
  value,
  onChange,
  type = "text",
  required = false,
  ...props
}) => {
  return (
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
        {...props}
        className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
    </div>
  );
};

export default GovernmentDashboard;
