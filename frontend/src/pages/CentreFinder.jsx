import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { ErrorMessage } from "../components/ErrorMessage";

export const CentreFinder = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [centres, setCentres] = useState([]);
  const [filteredCentres, setFilteredCentres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewType, setViewType] = useState("list"); // 'list' or 'map'
  const [filters, setFilters] = useState({
    state: "",
    district: "",
    searchTerm: "",
  });

  useEffect(() => {
    fetchCentres();
  }, []);

  const fetchCentres = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/api/v1/centres", {
        params: {
          state: filters.state,
          district: filters.district,
        },
      });
      setCentres(response.data.data || response.data);
      setFilteredCentres(response.data.data || response.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load centres");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const filtered = centres.filter((centre) => {
      const matchSearch =
        centre.name.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        centre.village
          ?.toLowerCase()
          .includes(filters.searchTerm.toLowerCase());
      const matchState = !filters.state || centre.state === filters.state;
      const matchDistrict =
        !filters.district || centre.district === filters.district;
      return matchSearch && matchState && matchDistrict;
    });
    setFilteredCentres(filtered);
  }, [filters, centres]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleViewCentre = (centreId) => {
    navigate(`/centre/${centreId}`);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-green-800 mb-2">
            Find Procurement Centres
          </h1>
          <p className="text-gray-600">
            Discover nearby centres to sell your harvested crops
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              type="text"
              placeholder="Search by name or village..."
              name="searchTerm"
              value={filters.searchTerm}
              onChange={handleFilterChange}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <select
              name="state"
              value={filters.state}
              onChange={handleFilterChange}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">All States</option>
              <option value="Punjab">Punjab</option>
              <option value="Haryana">Haryana</option>
              <option value="Uttar Pradesh">Uttar Pradesh</option>
              <option value="Maharashtra">Maharashtra</option>
            </select>
            <select
              name="district"
              value={filters.district}
              onChange={handleFilterChange}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">All Districts</option>
              {filters.state === "Punjab" && (
                <>
                  <option value="Amritsar">Amritsar</option>
                  <option value="Ludhiana">Ludhiana</option>
                  <option value="Jalandhar">Jalandhar</option>
                </>
              )}
            </select>
            <div className="flex gap-2">
              <button
                onClick={() => setViewType("list")}
                className={`flex-1 py-2 rounded-lg font-medium transition ${
                  viewType === "list"
                    ? "bg-green-600 text-white"
                    : "bg-gray-200 text-gray-700"
                }`}
              >
                List
              </button>
              <button
                onClick={() => setViewType("map")}
                className={`flex-1 py-2 rounded-lg font-medium transition ${
                  viewType === "map"
                    ? "bg-green-600 text-white"
                    : "bg-gray-200 text-gray-700"
                }`}
              >
                Map
              </button>
            </div>
          </div>
        </div>

        {error && <ErrorMessage message={error} />}

        {/* Results Count */}
        <div className="mb-6 text-gray-600">
          Found{" "}
          <span className="font-bold text-green-700">
            {filteredCentres.length}
          </span>{" "}
          centre{filteredCentres.length !== 1 ? "s" : ""}
        </div>

        {/* List View */}
        {viewType === "list" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCentres.map((centre) => (
              <div
                key={centre.id}
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition overflow-hidden"
              >
                <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-4">
                  <h3 className="text-xl font-bold">{centre.name}</h3>
                  <p className="text-green-100 text-sm">{centre.centreCode}</p>
                </div>
                <div className="p-6">
                  <div className="space-y-3 mb-6">
                    <div className="flex items-start gap-2">
                      <span className="text-green-600 text-lg">📍</span>
                      <div>
                        <p className="text-sm text-gray-600">Location</p>
                        <p className="font-medium">
                          {centre.village}, {centre.district}, {centre.state}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-green-600 text-lg">⏰</span>
                      <div>
                        <p className="text-sm text-gray-600">Operating Hours</p>
                        <p className="font-medium">
                          {centre.openingTime} - {centre.closingTime}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-green-600 text-lg">📊</span>
                      <div>
                        <p className="text-sm text-gray-600">Daily Capacity</p>
                        <p className="font-medium">
                          {centre.dailyCapacity} bookings/day
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-green-600 text-lg">✅</span>
                      <div>
                        <p className="text-sm text-gray-600">Status</p>
                        <p
                          className={`font-medium ${
                            centre.status === "ACTIVE"
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {centre.status}
                        </p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleViewCentre(centre.id)}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 rounded-lg transition"
                  >
                    View Details & Book
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Map View Placeholder */}
        {viewType === "map" && (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="text-6xl mb-4">🗺️</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Map View</h3>
            <p className="text-gray-600 mb-6">
              Interactive map view coming soon! For now, use the list view to
              browse centres.
            </p>
            <div className="bg-gray-100 rounded-lg p-8 h-96 flex items-center justify-center">
              <p className="text-gray-500">Map integration in progress...</p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {filteredCentres.length === 0 && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              No Centres Found
            </h3>
            <p className="text-gray-600">
              Try adjusting your filters to find procurement centres in your
              area.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
