import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { ErrorMessage } from "../components/ErrorMessage";

// Map component - simplified without require
const MapComponent = ({ centres, userLocation }) => {
  const mapContainer = React.useRef(null);
  const map = React.useRef(null);
  const [showMap, setShowMap] = useState(false);
  const [mapError, setMapError] = useState(null);

  useEffect(() => {
    if (!showMap || !mapContainer.current || !window.L) return;

    try {
      const L = window.L;

      // Reset map
      if (map.current) {
        map.current.remove();
        map.current = null;
      }

      // Create new map
      map.current = L.map(mapContainer.current).setView(
        [userLocation.latitude || 31.634, userLocation.longitude || 74.8711],
        8,
      );

      // Add tile layer
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map.current);

      // Add user location marker
      if (userLocation.latitude && userLocation.longitude) {
        L.circleMarker([userLocation.latitude, userLocation.longitude], {
          radius: 8,
          fillColor: "#FF0000",
          color: "#000",
          weight: 2,
          opacity: 1,
          fillOpacity: 0.8,
        })
          .bindPopup("📍 Your Location")
          .addTo(map.current);
      }

      // Add centre markers
      centres.forEach((centre) => {
        const lat = parseFloat(centre.latitude);
        const lng = parseFloat(centre.longitude);

        if (!isNaN(lat) && !isNaN(lng)) {
          L.marker([lat, lng])
            .bindPopup(
              `<strong>${centre.centreName || centre.name}</strong><br/>Queue: ${
                centre.currentQueueLength || 0
              }`,
            )
            .addTo(map.current);
        }
      });

      setMapError(null);
    } catch (error) {
      console.error("Map init error:", error);
      setMapError("Map failed to load. Make sure Leaflet is loaded.");
    }
  }, [showMap, centres, userLocation]);

  // Load Leaflet CSS and JS if not already loaded
  useEffect(() => {
    if (!window.L) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href =
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
      document.head.appendChild(link);

      const script = document.createElement("script");
      script.src =
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
      script.onload = () => {
        console.log("Leaflet loaded successfully");
      };
      script.onerror = () => {
        console.error("Failed to load Leaflet");
        setMapError("Failed to load map library");
      };
      document.head.appendChild(script);
    }
  }, []);

  if (!showMap) {
    return (
      <button
        onClick={() => setShowMap(true)}
        className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 mb-4 transition"
      >
        📍 Show Map View
      </button>
    );
  }

  return (
    <div className="mb-6 rounded-lg overflow-hidden border shadow-lg">
      <div className="flex justify-between items-center bg-blue-600 text-white p-3">
        <h3 className="font-semibold">Centre Locations Map</h3>
        <button
          onClick={() => setShowMap(false)}
          className="text-sm bg-blue-700 px-3 py-1 rounded hover:bg-blue-800"
        >
          ✕ Hide Map
        </button>
      </div>
      {mapError ? (
        <div className="h-96 bg-gray-100 flex items-center justify-center">
          <p className="text-red-600">{mapError}</p>
        </div>
      ) : (
        <div
          ref={mapContainer}
          style={{ height: "400px", width: "100%", background: "#e0e0e0" }}
        />
      )}
    </div>
  );
};

const EnhancedCentreFinder = () => {
  const navigate = useNavigate();
  const [centres, setCentres] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [userLocation, setUserLocation] = useState({
    latitude: null,
    longitude: null,
    name: "Current Location",
  });
  const [filters, setFilters] = useState({
    district: "",
    state: "",
    radius: "999", // Infinite/unlimited radius as default
  });
  const [recommendedCentres, setRecommendedCentres] = useState([]);
  const [useRecommendations, setUseRecommendations] = useState(false);

  const API_URL =
    import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1";

  // Get user location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            name: "Your Location",
          });
        },
        (error) => {
          console.warn("Location access denied, using default:", error);
          // Use default location (Amritsar, Punjab)
          setUserLocation({
            latitude: 31.634,
            longitude: 74.8711,
            name: "Default Location (Amritsar)",
          });
        },
      );
    }

    // Auto-fetch centres on load
    fetchCentres();
  }, []);

  // Fetch centres
  const fetchCentres = async () => {
    setLoading(true);
    setError("");
    try {
      const params = {
        ...(filters.district && { district: filters.district }),
        ...(filters.state && { state: filters.state }),
        ...(userLocation.latitude && { latitude: userLocation.latitude }),
        ...(userLocation.longitude && { longitude: userLocation.longitude }),
        // Only add radius if NOT infinite (999)
        ...(filters.radius !== "999" &&
          filters.radius && { radius: filters.radius }),
      };

      console.log("🔍 Fetching centres with params:", params);

      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_URL}/centres`, {
        params,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      console.log(
        "✅ Centres fetched:",
        response.data.data?.length || 0,
        "centres",
      );
      setCentres(response.data.data || []);
      setUseRecommendations(false);
    } catch (err) {
      console.error("Fetch centres error:", err);
      setError(err.response?.data?.message || "Failed to fetch centres");
      setCentres([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch recommendations
  const fetchRecommendations = async () => {
    if (!userLocation.latitude || !userLocation.longitude) {
      setError("Location access required for recommendations");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const params = {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        radius: filters.radius === "999" ? "500" : filters.radius,
      };

      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_URL}/recommendations/centres`, {
        params,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      setRecommendedCentres(response.data.data?.recommendations || []);
      setUseRecommendations(true);
    } catch (err) {
      console.error("Fetch recommendations error:", err);
      setError(
        err.response?.data?.message || "Failed to fetch recommendations",
      );
    } finally {
      setLoading(false);
    }
  };

  // Handle search
  const handleSearch = (e) => {
    e.preventDefault();
    fetchCentres();
  };

  // Display centres
  const displayCentres = useRecommendations ? recommendedCentres : centres;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Find Procurement Centres
          </h1>
          <p className="text-gray-600 mt-2">
            Search and book slots at nearby procurement centres
          </p>
        </div>

        {/* Error Message */}
        {error && <ErrorMessage message={error} onClose={() => setError("")} />}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <form onSubmit={handleSearch}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
              {/* Location Dropdown */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  📍 Location
                </label>
                <input
                  type="text"
                  value={userLocation.name}
                  disabled
                  className="w-full px-3 py-2 border rounded-lg bg-gray-100 text-gray-700 cursor-not-allowed"
                />
                {userLocation.latitude && (
                  <p className="text-xs text-gray-500 mt-1">
                    {userLocation.latitude.toFixed(4)},{" "}
                    {userLocation.longitude.toFixed(4)}
                  </p>
                )}
              </div>

              {/* State */}
              <div>
                <label className="block text-sm font-medium mb-1">State</label>
                <input
                  type="text"
                  placeholder="e.g., Punjab"
                  value={filters.state}
                  onChange={(e) =>
                    setFilters({ ...filters, state: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              {/* District */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  District
                </label>
                <input
                  type="text"
                  placeholder="e.g., Ludhiana"
                  value={filters.district}
                  onChange={(e) =>
                    setFilters({ ...filters, district: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              {/* Radius - with infinity option */}
              <div>
                <label className="block text-sm font-medium mb-1">Radius</label>
                <select
                  value={filters.radius}
                  onChange={(e) =>
                    setFilters({ ...filters, radius: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="999">All Locations (Unlimited)</option>
                  <option value="10">10 km</option>
                  <option value="25">25 km</option>
                  <option value="50">50 km</option>
                  <option value="100">100 km</option>
                  <option value="250">250 km</option>
                </select>
              </div>

              {/* Search Button */}
              <div>
                <label className="block text-sm font-medium mb-1">&nbsp;</label>
                <button
                  type="submit"
                  className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition font-medium"
                >
                  🔍 Search
                </button>
              </div>
            </div>

            {/* Recommendations Button */}
            <button
              type="button"
              onClick={fetchRecommendations}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition font-medium text-sm"
            >
              💡 Get Smart Recommendations
            </button>
          </form>
        </div>

        {/* Map View Toggle */}
        {displayCentres.length > 0 && (
          <MapComponent centres={displayCentres} userLocation={userLocation} />
        )}

        {/* Loading */}
        {loading && <LoadingSpinner />}

        {/* Results */}
        {!loading && displayCentres.length > 0 && (
          <div>
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                {useRecommendations
                  ? "Recommended Centres"
                  : "Available Centres"}{" "}
                <span className="text-gray-500 text-lg">
                  ({displayCentres.length})
                </span>
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {displayCentres.map((centre) => {
                const isInactive = centre.status !== "ACTIVE";

                return (
                  <div
                    key={centre.centreId || centre.id}
                    className={`rounded-lg shadow-md transition overflow-hidden ${
                      isInactive
                        ? "bg-gray-100 border border-gray-300 opacity-60"
                        : "bg-white hover:shadow-lg"
                    }`}
                  >
                    <div className="p-6">
                      {/* Title */}
                      <div className="flex items-start justify-between gap-3">
                        <h3
                          className={`text-lg font-bold ${
                            isInactive ? "text-gray-500" : "text-gray-900"
                          }`}
                        >
                          {centre.centreName || centre.name}
                        </h3>

                        {isInactive && (
                          <span className="shrink-0 px-2.5 py-1 rounded-full bg-gray-200 text-gray-600 text-xs font-semibold">
                            🔒 Closed
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-gray-600 mt-1">
                        {centre.address}
                      </p>

                      {/* Closed Notice */}
                      {isInactive && (
                        <div className="mt-3 rounded-lg bg-gray-200 border border-gray-300 px-3 py-2">
                          <p className="text-sm font-semibold text-gray-600">
                            🔒 Centre Currently Closed
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            This centre is temporarily not accepting bookings.
                          </p>
                        </div>
                      )}

                      {/* Key Info Grid */}
                      <div className="grid grid-cols-2 gap-3 mt-4">
                        <div className="bg-blue-50 p-3 rounded">
                          <p className="text-xs text-gray-600">Distance</p>
                          <p className="font-bold text-lg">
                            {centre.distance != null
                              ? centre.distance.toFixed(1)
                              : centre.distanceKm != null
                                ? centre.distanceKm.toFixed(1)
                                : "N/A"}{" "}
                            km
                          </p>
                        </div>

                        <div className="bg-green-50 p-3 rounded">
                          <p className="text-xs text-gray-600">Queue</p>
                          <p className="font-bold text-lg">
                            {centre.currentQueueLength || 0}
                          </p>
                        </div>

                        <div className="bg-orange-50 p-3 rounded">
                          <p className="text-xs text-gray-600">Congestion</p>
                          <p
                            className={`font-bold text-lg ${
                              centre.congestionLevel === "LOW"
                                ? "text-green-600"
                                : centre.congestionLevel === "MEDIUM"
                                  ? "text-orange-600"
                                  : "text-red-600"
                            }`}
                          >
                            {centre.congestionLevel || "LOW"}
                          </p>
                        </div>

                        <div className="bg-purple-50 p-3 rounded">
                          <p className="text-xs text-gray-600">Wait Time</p>
                          <p className="font-bold text-lg">
                            {centre.estimatedWaitMinutes || 0} min
                          </p>
                        </div>
                      </div>

                      {/* Score - if recommendations */}
                      {useRecommendations && (
                        <div className="mt-3 bg-gradient-to-r from-green-50 to-blue-50 p-3 rounded">
                          <p className="text-xs text-gray-600">
                            Recommendation Score
                          </p>

                          <div className="flex items-center justify-between mt-1">
                            <p className="font-bold text-xl">
                              {centre.score}/100
                            </p>

                            <div className="w-24 bg-gray-300 rounded-full h-2">
                              <div
                                className="bg-green-600 h-2 rounded-full"
                                style={{
                                  width: `${Math.min(centre.score, 100)}%`,
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Hours & Capacity */}
                      <div className="mt-4 pt-4 border-t space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Hours:</span>

                          <span className="font-medium">
                            {centre.openingTime || "09:00"} -{" "}
                            {centre.closingTime || "17:00"}
                          </span>
                        </div>

                        <div className="flex justify-between">
                          <span className="text-gray-600">
                            Available Capacity:
                          </span>

                          <span className="font-medium">
                            {centre.availableCapacity ||
                              centre.availableSlots ||
                              0}
                          </span>
                        </div>
                      </div>

                      {/* Action Button */}
                      <button
                        onClick={() => {
                          if (isInactive) return;

                          navigate(`/centre/${centre.centreId || centre.id}`);
                        }}
                        disabled={isInactive}
                        className={`w-full mt-4 py-2 rounded-lg transition font-medium ${
                          isInactive
                            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                            : "bg-green-600 text-white hover:bg-green-700"
                        }`}
                      >
                        {isInactive
                          ? "🔒 Centre Currently Closed"
                          : "View Details & Book →"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* No Results */}
        {!loading && displayCentres.length === 0 && !error && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-600 text-lg">
              No centres found. Try adjusting your filters or search without
              filters.
            </p>
            <button
              onClick={() => {
                setFilters({ district: "", state: "", radius: "999" });
                setTimeout(fetchCentres, 100);
              }}
              className="mt-4 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
            >
              Clear Filters & Search
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedCentreFinder;
