/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} Distance in kilometers
 */
export const calculateHaversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return parseFloat(distance.toFixed(2));
};

/**
 * Convert degrees to radians
 * @param {number} degrees
 * @returns {number} radians
 */
const toRad = (degrees) => {
  return degrees * (Math.PI / 180);
};

/**
 * Filter centres by distance from a given location
 * @param {Array} centres - Array of centre objects with latitude, longitude
 * @param {number} userLat - User's latitude
 * @param {number} userLon - User's longitude
 * @param {number} radiusKm - Radius in kilometers
 * @returns {Array} Filtered centres with distance added
 */
export const filterCentresByDistance = (
  centres,
  userLat,
  userLon,
  radiusKm = 50
) => {
  return centres
    .map((centre) => ({
      ...centre,
      distance: calculateHaversineDistance(
        userLat,
        userLon,
        parseFloat(centre.latitude),
        parseFloat(centre.longitude)
      ),
    }))
    .filter((centre) => centre.distance <= radiusKm)
    .sort((a, b) => a.distance - b.distance);
};

/**
 * Calculate congestion level based on current bookings vs capacity
 * @param {number} bookedCount
 * @param {number} capacity
 * @returns {string} Congestion level: LOW, MEDIUM, HIGH
 */
export const calculateCongestionLevel = (bookedCount, capacity) => {
  const occupancyRate = (bookedCount / capacity) * 100;

  if (occupancyRate < 50) return "LOW";
  if (occupancyRate < 80) return "MEDIUM";
  return "HIGH";
};

/**
 * Calculate estimated wait time based on queue position
 * @param {number} queuePosition - Current queue position
 * @param {number} averageServiceTimeMinutes - Average time per person (default 15)
 * @returns {number} Estimated wait time in minutes
 */
export const calculateEstimatedWaitTime = (
  queuePosition,
  averageServiceTimeMinutes = 15
) => {
  return queuePosition * averageServiceTimeMinutes;
};
