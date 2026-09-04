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

const SkeletonCard = () => (
  <div className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse">
    <div className="p-6">
      <div className="h-6 bg-gray-200 rounded w-3/4 mb-3"></div>
      <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>

      <div className="grid grid-cols-2 gap-3 mt-4">
        <div className="bg-gray-100 p-3 rounded h-16"></div>
        <div className="bg-gray-100 p-3 rounded h-16"></div>
        <div className="bg-gray-100 p-3 rounded h-16"></div>
        <div className="bg-gray-100 p-3 rounded h-16"></div>
      </div>

      <div className="mt-4 pt-4 border-t space-y-3">
        <div className="flex justify-between">
          <div className="h-4 bg-gray-200 rounded w-16"></div>
          <div className="h-4 bg-gray-200 rounded w-24"></div>
        </div>
        <div className="flex justify-between">
          <div className="h-4 bg-gray-200 rounded w-32"></div>
          <div className="h-4 bg-gray-200 rounded w-12"></div>
        </div>
      </div>

      <div className="mt-6 h-10 bg-gray-200 rounded-lg w-full"></div>
    </div>
  </div>
);

const EnhancedCentreFinder = () => {
  const navigate = useNavigate();
  const [centres, setCentres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isLoadingGps, setIsLoadingGps] = useState(false);
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

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const toggleLocation = () => {
    if (userLocation.latitude !== null) {
      // Turn OFF GPS
      setUserLocation({
        latitude: null,
        longitude: null,
        name: "Current Location",
      });
      setFilters(prev => ({ ...prev, radius: "999" }));
    } else {
      // Turn ON GPS
      if (navigator.geolocation) {
        setLoading(true);
        setIsLoadingGps(true);
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setIsLoadingGps(false);
            setUserLocation({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              name: "GPS Active",
            });
          },
          (error) => {
            setIsLoadingGps(false);
            console.warn("Location access denied:", error);
            setError(
              "Location access denied. Please select State and District manually.",
            );
            setLoading(false);
          },
        );
      } else {
        setError("Geolocation is not supported by your browser.");
      }
    }
  };

  // Fetch centres whenever location state changes (including initial mount)
  useEffect(() => {
    fetchCentres();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLocation.latitude]);

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
        ...(filters.radius && { radius: filters.radius }),
      };

      console.log("🔍 Fetching centres with params:", params);

      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_URL}/centres`, {
        params,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      setCentres(response.data.data || response.data.centres || []);
    } catch (err) {
      console.error("Error fetching centres:", err);
      setError("Failed to fetch procurement centres. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch recommendations
  const fetchRecommendations = async () => {
    if (!userLocation.latitude || !userLocation.longitude) {
      setError("Location access required for recommendations. Click 'Use My GPS Location' first.");
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
      console.log(
        "🧠 Recommendations fetched:",
        response.data.data?.recommendations?.length || 0,
      );
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
    setUseRecommendations(false);
    fetchCentres();
  };

  // Display centres
  const displayCentres = useRecommendations ? recommendedCentres : centres;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header & MapComponent ... */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Find Procurement Centres
          </h1>
          <p className="text-gray-600">
            Search and book slots at nearby procurement centres
          </p>
        </div>

        {/* Filter Card */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-6 border">
          <form
            onSubmit={handleSearch}
            className="flex flex-col md:flex-row gap-4 items-end"
          >
            <div className="w-full md:w-1/4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                State
              </label>
              <select
                value={filters.state}
                onChange={(e) =>
                  setFilters({ ...filters, state: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
              >
                <option value="">All States</option>
                <option value="Punjab">Punjab</option>
                <option value="Haryana">Haryana</option>
              </select>
            </div>

            <div className="w-full md:w-1/4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                District
              </label>
              <select
                value={filters.district}
                onChange={(e) =>
                  setFilters({ ...filters, district: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
              >
                <option value="">All Districts</option>
                <option value="Amritsar">Amritsar</option>
                <option value="Bathinda">Bathinda</option>
                <option value="Jalandhar">Jalandhar</option>
                <option value="Ludhiana">Ludhiana</option>
                <option value="Mohali">Mohali</option>
                <option value="Patiala">Patiala</option>
              </select>
            </div>

            <div className="w-full md:w-1/4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Radius {userLocation.latitude ? "" : "(Needs GPS)"}
              </label>
              <select
                value={filters.radius}
                onChange={(e) =>
                  setFilters({ ...filters, radius: e.target.value })
                }
                disabled={!userLocation.latitude}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${!userLocation.latitude ? "bg-gray-100 text-gray-400" : "bg-white"}`}
              >
                <option value="999">Infinite</option>
                <option value="10">10 km</option>
                <option value="25">25 km</option>
                <option value="50">50 km</option>
                <option value="100">100 km</option>
              </select>
            </div>

            <div className="w-full md:w-auto flex-grow flex justify-end">
              <button
                type="submit"
                className="w-full md:w-32 bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition"
              >
                🔍 Search
              </button>
            </div>
          </form>

          <div className="mt-4 pt-4 border-t flex flex-wrap gap-3">
            <button
              type="button"
              onClick={toggleLocation}
              className={`${userLocation.latitude ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-800 hover:bg-gray-900'} text-white px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm`}
            >
              {userLocation.latitude ? '📍 Turn OFF GPS' : '📍 Use My GPS Location'}
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                fetchRecommendations();
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition shadow-sm"
              disabled={loading}
            >
              💡 Get Smart Recommendations
            </button>
          </div>
        </div>

        {/* Map View Toggle */}
        {!loading && displayCentres.length > 0 && (
          <MapComponent centres={displayCentres} userLocation={userLocation} />
        )}

        {error && <ErrorMessage message={error} onClose={() => setError("")} />}

        {/* Loading Skeleton */}
        {loading && (
          <div className="animate-pulse">
            <div className="mb-4 flex items-center gap-3">
              <svg className="animate-spin h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <h2 className="text-xl font-semibold text-gray-500">
                {isLoadingGps ? "Acquiring GPS location..." : "Fetching available centres..."}
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          </div>
        )}

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
                            ⚠️ Closed
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
                            ⚠️ Centre Currently Closed
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            This centre is temporarily not accepting bookings.
                          </p>
                        </div>
                      )}

                      {/* Key Info Grid */}
                      <div className="grid grid-cols-2 gap-3 mt-4">
                        <div className="bg-blue-50 p-3 rounded flex flex-col justify-center">
                          <p className="text-xs text-gray-600">Distance</p>
                          {centre.distance != null || centre.distanceKm != null ? (
                            <p className="font-bold text-lg text-gray-900">
                              {(centre.distance ?? centre.distanceKm).toFixed(1)} km
                            </p>
                          ) : (
                            <p className="text-sm font-semibold text-gray-400 mt-0.5">
                              (Needs GPS)
                            </p>
                          )}
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
