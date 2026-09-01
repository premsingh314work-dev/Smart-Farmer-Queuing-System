import React, { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { ErrorMessage } from "../components/ErrorMessage";

export const OperatorDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("queue");
  const [queue, setQueue] = useState([]);
  const [currentServing, setCurrentServing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [qualityForm, setQualityForm] = useState({
    qualityStatus: "PASSED",
    grade: "A",
    moisturePercentage: "",
    remarks: "",
  });
  const [weighmentForm, setWeighmentForm] = useState({
    actualQuantity: "",
    remarks: "",
  });
  const [procurementForm, setProcurementForm] = useState({
    procurementAmount: "",
    remarks: "",
  });

  useEffect(() => {
    fetchQueueData();
    const interval = setInterval(fetchQueueData, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchQueueData = async () => {
    try {
      setLoading(true);
      // Get operator's centre from user profile
      const response = await axios.get("/api/v1/queue/centre/current", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setQueue(response.data.data || response.data);
      setCurrentServing(response.data.currentServing || null);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load queue");
    } finally {
      setLoading(false);
    }
  };

  const handleCallNext = async () => {
    try {
      const nextBooking = queue.find(
        (b) =>
          b.status === "WAITING" &&
          b.booking?.status !== "ARRIVED" &&
          b.booking?.status !== "NO_SHOW",
      );

      if (!nextBooking) {
        alert("No more farmers waiting in queue");
        return;
      }

      await axios.post(
        `/api/v1/queue/${nextBooking.centreId}/call-next`,
        {},
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );

      fetchQueueData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to call next farmer");
    }
  };

  const handleNoShow = async (bookingId) => {
    if (!window.confirm("Mark this farmer as no-show?")) return;

    try {
      await axios.post(
        `/api/v1/queue/${bookingId}/no-show`,
        {},
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
      fetchQueueData();
      setSelectedBooking(null);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to mark no-show");
    }
  };

  const handleSubmitQuality = async () => {
    if (!selectedBooking) return;

    try {
      await axios.post(
        `/api/v1/procurements/${selectedBooking.bookingId}/quality`,
        {
          quality_status: qualityForm.qualityStatus,
          grade: qualityForm.grade,
          moisture_percentage: qualityForm.moisturePercentage,
          remarks: qualityForm.remarks,
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );

      alert("Quality check submitted successfully");
      setQualityForm({
        qualityStatus: "PASSED",
        grade: "A",
        moisturePercentage: "",
        remarks: "",
      });
      fetchQueueData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to submit quality check");
    }
  };

  const handleSubmitWeighment = async () => {
    if (!selectedBooking || !weighmentForm.actualQuantity) {
      alert("Please enter the actual quantity");
      return;
    }

    try {
      await axios.post(
        `/api/v1/procurements/${selectedBooking.bookingId}/weighment`,
        {
          actual_quantity: weighmentForm.actualQuantity,
          unit: selectedBooking.crop?.unit || "kg",
          remarks: weighmentForm.remarks,
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );

      alert("Weighment submitted successfully");
      setWeighmentForm({ actualQuantity: "", remarks: "" });
      fetchQueueData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to submit weighment");
    }
  };

  const handleCompleteProcurement = async () => {
    if (!selectedBooking || !procurementForm.procurementAmount) {
      alert("Please enter the procurement amount");
      return;
    }

    try {
      await axios.post(
        `/api/v1/procurements/${selectedBooking.bookingId}/complete`,
        {
          procurement_amount: procurementForm.procurementAmount,
          remarks: procurementForm.remarks,
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );

      alert("Procurement completed successfully");
      setProcurementForm({ procurementAmount: "", remarks: "" });
      setSelectedBooking(null);
      fetchQueueData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to complete procurement");
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Operator Dashboard
          </h1>
          <p className="text-gray-600">
            Manage queue and procurement operations
          </p>
        </div>

        {error && <ErrorMessage message={error} />}

        {/* Tab Navigation */}
        <div className="flex gap-4 mb-8 border-b">
          <button
            onClick={() => setActiveTab("queue")}
            className={`px-6 py-3 font-bold transition ${
              activeTab === "queue"
                ? "text-green-600 border-b-2 border-green-600"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            📋 Queue Management
          </button>
          <button
            onClick={() => setActiveTab("processing")}
            className={`px-6 py-3 font-bold transition ${
              activeTab === "processing"
                ? "text-green-600 border-b-2 border-green-600"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            🔄 Processing
          </button>
        </div>

        {/* Queue Management Tab */}
        {activeTab === "queue" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left - Queue List */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">
                    Queue List
                  </h2>
                  <button
                    onClick={handleCallNext}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition"
                  >
                    📢 Call Next
                  </button>
                </div>

                <div className="space-y-3">
                  {queue.length > 0 ? (
                    queue.map((entry) => (
                      <div
                        key={entry.id}
                        onClick={() => setSelectedBooking(entry.booking)}
                        className={`p-4 border-2 rounded-lg cursor-pointer transition ${
                          selectedBooking?.id === entry.bookingId
                            ? "border-green-500 bg-green-50"
                            : "border-gray-200 hover:border-green-400"
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-bold text-lg">
                              Token #{entry.tokenNumber}
                            </p>
                            <p className="text-gray-600 text-sm">
                              {entry.booking?.farmer?.user?.name}
                            </p>
                            <p className="text-gray-600 text-sm">
                              {entry.booking?.crop?.cropType} -{" "}
                              {entry.booking?.crop?.quantity}{" "}
                              {entry.booking?.crop?.unit}
                            </p>
                          </div>
                          <div className="text-right">
                            <span
                              className={`px-3 py-1 rounded-full text-sm font-bold text-white ${
                                entry.status === "WAITING"
                                  ? "bg-blue-500"
                                  : entry.status === "CALLED"
                                    ? "bg-orange-500"
                                    : entry.status === "SERVING"
                                      ? "bg-green-500"
                                      : entry.status === "COMPLETED"
                                        ? "bg-gray-500"
                                        : "bg-red-500"
                              }`}
                            >
                              {entry.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      <p>No farmers in queue</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right - Selected Booking Summary */}
            {selectedBooking && (
              <div className="bg-white rounded-lg shadow-lg p-6 sticky top-4">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">
                  Selected Booking
                </h2>
                <div className="space-y-6">
                  <div>
                    <p className="text-sm text-gray-600 font-bold">
                      FARMER NAME
                    </p>
                    <p className="font-bold text-lg">
                      {selectedBooking.farmer?.user?.name}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-bold">CROP</p>
                    <p className="font-bold text-lg">
                      {selectedBooking.crop?.cropType}
                    </p>
                    <p className="text-gray-700">
                      {selectedBooking.crop?.quantity}{" "}
                      {selectedBooking.crop?.unit}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-bold">STATUS</p>
                    <p className="font-bold text-lg mt-1">
                      {selectedBooking.status}
                    </p>
                  </div>
                  <button
                    onClick={() => handleNoShow(selectedBooking.id)}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded-lg transition"
                  >
                    ❌ Mark No-Show
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Processing Tab */}
        {activeTab === "processing" && selectedBooking && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left - Processing Steps */}
            <div className="lg:col-span-2 space-y-8">
              {/* Quality Check Form */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">
                  Quality Check
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-700 font-bold mb-2">
                      Status
                    </label>
                    <select
                      value={qualityForm.qualityStatus}
                      onChange={(e) =>
                        setQualityForm({
                          ...qualityForm,
                          qualityStatus: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="PASSED">PASSED</option>
                      <option value="FAILED">FAILED</option>
                      <option value="CONDITIONAL">CONDITIONAL</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-2">
                      Grade
                    </label>
                    <select
                      value={qualityForm.grade}
                      onChange={(e) =>
                        setQualityForm({
                          ...qualityForm,
                          grade: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="A">A - Excellent</option>
                      <option value="B">B - Good</option>
                      <option value="C">C - Average</option>
                      <option value="D">D - Poor</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-2">
                      Moisture %
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={qualityForm.moisturePercentage}
                      onChange={(e) =>
                        setQualityForm({
                          ...qualityForm,
                          moisturePercentage: e.target.value,
                        })
                      }
                      placeholder="e.g., 12.5"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-2">
                      Remarks
                    </label>
                    <textarea
                      value={qualityForm.remarks}
                      onChange={(e) =>
                        setQualityForm({
                          ...qualityForm,
                          remarks: e.target.value,
                        })
                      }
                      placeholder="Any additional notes..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      rows="3"
                    />
                  </div>
                  <button
                    onClick={handleSubmitQuality}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg transition"
                  >
                    ✓ Submit Quality Check
                  </button>
                </div>
              </div>

              {/* Weighment Form */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">
                  Weighment
                </h2>
                <div className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-blue-800">
                      Expected Quantity:{" "}
                      <span className="font-bold">
                        {selectedBooking.crop?.quantity}{" "}
                        {selectedBooking.crop?.unit}
                      </span>
                    </p>
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-2">
                      Actual Quantity
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={weighmentForm.actualQuantity}
                      onChange={(e) =>
                        setWeighmentForm({
                          ...weighmentForm,
                          actualQuantity: e.target.value,
                        })
                      }
                      placeholder="Enter actual quantity"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-2">
                      Remarks
                    </label>
                    <textarea
                      value={weighmentForm.remarks}
                      onChange={(e) =>
                        setWeighmentForm({
                          ...weighmentForm,
                          remarks: e.target.value,
                        })
                      }
                      placeholder="Any notes about weighment..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      rows="2"
                    />
                  </div>
                  <button
                    onClick={handleSubmitWeighment}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg transition"
                  >
                    ⚖️ Submit Weighment
                  </button>
                </div>
              </div>

              {/* Procurement Completion */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">
                  Complete Procurement
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-700 font-bold mb-2">
                      Procurement Amount
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={procurementForm.procurementAmount}
                      onChange={(e) =>
                        setProcurementForm({
                          ...procurementForm,
                          procurementAmount: e.target.value,
                        })
                      }
                      placeholder="Enter payment amount"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-2">
                      Remarks
                    </label>
                    <textarea
                      value={procurementForm.remarks}
                      onChange={(e) =>
                        setProcurementForm({
                          ...procurementForm,
                          remarks: e.target.value,
                        })
                      }
                      placeholder="Final notes..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      rows="2"
                    />
                  </div>
                  <button
                    onClick={handleCompleteProcurement}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded-lg transition"
                  >
                    ✓ Complete Procurement
                  </button>
                </div>
              </div>
            </div>

            {/* Right - Booking Summary */}
            <div className="bg-white rounded-lg shadow-lg p-6 sticky top-4">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Summary</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 font-bold">BOOKING</p>
                  <p className="font-bold text-lg">
                    {selectedBooking.bookingNumber}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-bold">FARMER</p>
                  <p className="font-bold">
                    {selectedBooking.farmer?.user?.name}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-bold">CROP</p>
                  <p className="font-bold">{selectedBooking.crop?.cropType}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-bold">QUANTITY</p>
                  <p className="font-bold">
                    {selectedBooking.crop?.quantity}{" "}
                    {selectedBooking.crop?.unit}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-bold">
                    CURRENT STATUS
                  </p>
                  <p className="font-bold text-lg">{selectedBooking.status}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "processing" && !selectedBooking && (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <p className="text-gray-600 text-lg">
              Please select a booking from the queue to start processing.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
