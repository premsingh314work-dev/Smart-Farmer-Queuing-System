import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import { ErrorMessage } from "../../components/ErrorMessage";
import { getToken } from "../../api/auth";
import { socket, connectSocket } from "../../socket/socket";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1";

export const OperatorDashboard = () => {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState("queue");

  const [centre, setCentre] = useState(null);
  const [queue, setQueue] = useState([]);
  const [currentServing, setCurrentServing] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedBooking, setSelectedBooking] = useState(null);

  const [simulatedTime, setSimulatedTime] = useState("");
  const simulatedTimeRef = useRef("");
  const [timeInputValue, setTimeInputValue] = useState("");
  const [isQueueLoading, setIsQueueLoading] = useState(false);

  useEffect(() => {
    simulatedTimeRef.current = simulatedTime;
  }, [simulatedTime]);

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

  // --------------------------------------------------
  // AUTH HEADER
  // --------------------------------------------------

  const getAuthConfig = () => ({
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  });

  // --------------------------------------------------
  // FETCH OPERATOR CENTRE + QUEUE
  // --------------------------------------------------

  const fetchQueueData = async () => {
    try {
      const query = simulatedTimeRef.current ? `?simulatedTime=${simulatedTimeRef.current}` : "";
      const response = await axios.get(`${API_URL}/queue/centre/current${query}`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      const newQueue = response.data.queue || [];
      const newCurrentServing = response.data.currentServing || null;

      setCentre(response.data.centre || null);
      setQueue(newQueue);
      setCurrentServing(newCurrentServing);
      setError(null);

      // Keep selected booking updated when queue refreshes
      if (selectedBooking?.id) {
        const updatedEntry = newQueue.find(
          (entry) => entry.bookingId === selectedBooking.id,
        );

        if (updatedEntry?.booking) {
          setSelectedBooking(updatedEntry.booking);
        } else if (newCurrentServing?.booking?.id === selectedBooking.id) {
          setSelectedBooking(newCurrentServing.booking);
        }
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to load operator centre and queue",
      );
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------
  // INITIAL LOAD + REAL-TIME SOCKET UPDATES
  // --------------------------------------------------

  useEffect(() => {
    fetchQueueData();

    const handleConnect = () => {
      console.log("🔌 Operator Socket connected:", socket.id);
    };

    const handleDisconnect = (reason) => {
      console.log("🔌 Operator Socket disconnected:", reason);
    };

    const handleConnectError = (err) => {
      console.error("❌ Operator Socket connection error:", err.message);
    };

    const handleQueueUpdate = (data) => {
      console.log("📡 Queue update received:", data);
      fetchQueueData();
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);
    socket.on("queue:updated", handleQueueUpdate);

    connectSocket();

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
      socket.off("queue:updated", handleQueueUpdate);

      socket.disconnect();
    };
  }, [user?.id]);

  useEffect(() => {
    setIsQueueLoading(true);
    fetchQueueData().finally(() => setIsQueueLoading(false));
  }, [simulatedTime]);

  // --------------------------------------------------
  // SELECT BOOKING
  // --------------------------------------------------

  const handleSelectBooking = (booking) => {
    if (!booking) return;

    setSelectedBooking(booking);
  };

  // --------------------------------------------------
  // CALL NEXT FARMER
  // --------------------------------------------------

  const handleCallNext = async () => {
    if (!centre?.id) {
      alert("Centre information is not available");
      return;
    }

    if (centre.status !== "ACTIVE") {
      alert("This centre is currently inactive");
      return;
    }

    const activeQueueEntry = queue.find((entry) =>
      ["CALLED", "SERVING"].includes(entry.status),
    );

    if (currentServing || activeQueueEntry) {
      alert(
        "A farmer is already called or being served. Complete the current farmer first.",
      );
      return;
    }

    const nextWaiting = queue.find((entry) => entry.status === "WAITING");

    if (!nextWaiting) {
      alert("No farmer is waiting in the queue");
      return;
    }

    try {
      await axios.post(
        `${API_URL}/queue/${centre.id}/call-next`,
        {},
        getAuthConfig(),
      );

      await fetchQueueData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to call next farmer");
    }
  };

  // --------------------------------------------------
  // MARK NO-SHOW
  // --------------------------------------------------

  const handleNoShow = async (bookingId) => {
    if (!bookingId) return;

    if (!window.confirm("Mark this farmer as no-show? They will be moved to the back of the queue.")) {
      return;
    }

    try {
      await axios.post(
        `${API_URL}/queue/${bookingId}/no-show`,
        {},
        getAuthConfig(),
      );

      setSelectedBooking(null);

      await fetchQueueData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to mark farmer as no-show");
    }
  };

  const handleAbsent = async (bookingId) => {
    if (!bookingId) return;

    if (!window.confirm("Mark this farmer as absent? This will permanently CANCEL their booking.")) {
      return;
    }

    try {
      await axios.post(
        `${API_URL}/queue/${bookingId}/absent`,
        {},
        getAuthConfig(),
      );

      setSelectedBooking(null);

      await fetchQueueData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to mark farmer as absent");
    }
  };

  // --------------------------------------------------
  // PROCEED TO PROCESSING
  // --------------------------------------------------

  const handleProceedToProcessing = async () => {
    if (!selectedBooking?.id) {
      return;
    }

    try {
      await axios.post(
        `${API_URL}/procurements/${selectedBooking.id}/start`,
        {},
        getAuthConfig(),
      );

      alert("Processing started successfully");

      setSelectedBooking((previous) =>
        previous
          ? {
              ...previous,
              status: "VERIFICATION",
            }
          : null,
      );

      setActiveTab("processing");

      await fetchQueueData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to start processing");
    }
  };

  // --------------------------------------------------
  // QUALITY CHECK
  // --------------------------------------------------

  const handleSubmitQuality = async () => {
    if (!selectedBooking?.id) {
      return;
    }

    if (!qualityForm.qualityStatus) {
      alert("Please select quality status");
      return;
    }

    try {
      await axios.post(
        `${API_URL}/procurements/${selectedBooking.id}/quality`,
        {
          quality_status: qualityForm.qualityStatus,
          grade: qualityForm.grade || null,
          moisture_percentage: qualityForm.moisturePercentage || null,
          remarks: qualityForm.remarks || null,
        },
        getAuthConfig(),
      );

      alert("Quality check submitted successfully");

      setQualityForm({
        qualityStatus: "PASSED",
        grade: "A",
        moisturePercentage: "",
        remarks: "",
      });

      setSelectedBooking((previous) =>
        previous
          ? {
              ...previous,
              status: "QUALITY_CHECK",
            }
          : null,
      );

      await fetchQueueData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to submit quality check");
    }
  };

  // --------------------------------------------------
  // WEIGHMENT
  // --------------------------------------------------

  const handleSubmitWeighment = async () => {
    if (!selectedBooking?.id) {
      return;
    }

    if (!weighmentForm.actualQuantity) {
      alert("Please enter the actual quantity");
      return;
    }

    try {
      await axios.post(
        `${API_URL}/procurements/${selectedBooking.id}/weighment`,
        {
          actual_quantity: weighmentForm.actualQuantity,
          unit: selectedBooking.crop?.unit || "kg",
          remarks: weighmentForm.remarks || null,
        },
        getAuthConfig(),
      );

      alert("Weighment submitted successfully");

      setWeighmentForm({
        actualQuantity: "",
        remarks: "",
      });

      setSelectedBooking((previous) =>
        previous
          ? {
              ...previous,
              status: "WEIGHING",
            }
          : null,
      );

      await fetchQueueData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to submit weighment");
    }
  };

  // --------------------------------------------------
  // COMPLETE PROCUREMENT
  // --------------------------------------------------

  const handleCompleteProcurement = async () => {
    if (!selectedBooking?.id) {
      return;
    }

    if (!procurementForm.procurementAmount) {
      alert("Please enter the procurement amount");
      return;
    }

    try {
      await axios.post(
        `${API_URL}/procurements/${selectedBooking.id}/complete`,
        {
          procurement_amount: procurementForm.procurementAmount,
          remarks: procurementForm.remarks || null,
        },
        getAuthConfig(),
      );

      alert("Procurement completed successfully");

      setProcurementForm({
        procurementAmount: "",
        remarks: "",
      });

      setSelectedBooking(null);
      setActiveTab("queue");

      await fetchQueueData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to complete procurement");
    }
  };

  // --------------------------------------------------
  // QUEUE STATISTICS
  // --------------------------------------------------

  const waitingCount = queue.filter(
    (entry) => entry.status === "WAITING",
  ).length;

  const calledCount = queue.filter((entry) => entry.status === "CALLED").length;

  const servingCount = queue.filter(
    (entry) => entry.status === "SERVING",
  ).length;

  // --------------------------------------------------
  // PROCESSING STATE
  // --------------------------------------------------

  const selectedStatus = selectedBooking?.status;

  const canProceedToProcessing =
    selectedStatus === "CALLED" || selectedStatus === "IN_QUEUE";

  const canMarkNoShow =
    selectedStatus === "CALLED" || selectedStatus === "IN_QUEUE";

  const canSubmitQuality = selectedStatus === "VERIFICATION";

  const canSubmitWeighment = selectedStatus === "QUALITY_CHECK";

  const canCompleteProcurement = selectedStatus === "WEIGHING";

  // --------------------------------------------------
  // INITIAL LOADING
  // --------------------------------------------------

  if (loading && !centre) {
    return <LoadingSpinner />;
  }

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* HEADER */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Operator Dashboard
          </h1>

          <p className="text-gray-600">
            Manage queue and procurement operations
          </p>

          {user?.name && (
            <p className="text-sm text-gray-500 mt-1">Welcome, {user.name}</p>
          )}
        </div>

        {error && <ErrorMessage message={error} />}

        {/* CENTRE INFORMATION */}
        {centre && (
          <div className="bg-white rounded-lg shadow-lg p-5 mb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="text-sm text-gray-500 font-semibold">
                  ASSIGNED PROCUREMENT CENTRE
                </p>

                <h2 className="text-2xl font-bold text-gray-800 mt-1">
                  {centre.name}
                </h2>

                <p className="text-sm text-gray-600 mt-1">
                  {centre.centreCode} • {centre.district}, {centre.state}
                </p>

                <p className="text-sm text-gray-500 mt-1">
                  Daily Capacity: {centre.dailyCapacity}
                </p>
              </div>

              <div className="flex flex-col items-start md:items-end gap-2">
                <div
                  className={`px-4 py-2 rounded-full font-bold text-sm ${
                    centre.status === "ACTIVE"
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {centre.status === "ACTIVE"
                    ? "● Centre Active"
                    : "● Centre Inactive"}
                </div>

                <div className="text-xs text-gray-500 flex items-center gap-1">
                  <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
                  Live queue updates enabled
                </div>

                <div className="mt-4 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                  <p className="text-xs text-indigo-800 font-bold mb-1">Time Simulator (Test Mode)</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      value={timeInputValue}
                      onChange={(e) => setTimeInputValue(e.target.value)}
                      className="text-sm px-2 py-1 border rounded bg-white"
                    />
                    <button
                      onClick={() => setSimulatedTime(timeInputValue)}
                      className="text-xs px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded"
                    >
                      Enter
                    </button>
                    <button
                      onClick={() => {
                        setTimeInputValue("");
                        setSimulatedTime("");
                      }}
                      className="text-xs px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded ml-1"
                    >
                      Reset to Real Time
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STATISTICS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-5">
            <p className="text-sm text-gray-500">Waiting</p>

            <p className="text-3xl font-bold text-blue-600">{waitingCount}</p>
          </div>

          <div className="bg-white rounded-lg shadow p-5">
            <p className="text-sm text-gray-500">Called</p>

            <p className="text-3xl font-bold text-orange-500">{calledCount}</p>
          </div>

          <div className="bg-white rounded-lg shadow p-5">
            <p className="text-sm text-gray-500">Serving</p>

            <p className="text-3xl font-bold text-green-600">{servingCount}</p>
          </div>

          <div className="bg-white rounded-lg shadow p-5">
            <p className="text-sm text-gray-500">Current Token</p>

            <p className="text-3xl font-bold text-purple-600">
              {currentServing?.tokenNumber
                ? `#${currentServing.tokenNumber}`
                : "—"}
            </p>
          </div>
        </div>

        {/* TABS */}
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

        {/* ================================================= */}
        {/* QUEUE TAB */}
        {/* ================================================= */}

        {activeTab === "queue" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* QUEUE LIST */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">
                    Queue List
                  </h2>

                  <button
                    onClick={handleCallNext}
                    disabled={
                      !centre ||
                      centre.status !== "ACTIVE" ||
                      !!currentServing ||
                      queue.some((entry) =>
                        ["CALLED", "SERVING"].includes(entry.status),
                      )
                    }
                    className={`font-bold py-2 px-4 rounded-lg transition ${
                      !centre ||
                      centre.status !== "ACTIVE" ||
                      !!currentServing ||
                      queue.some((entry) =>
                        ["CALLED", "SERVING"].includes(entry.status),
                      )
                        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                        : "bg-green-600 hover:bg-green-700 text-white"
                    }`}
                  >
                    📢 Call Next
                  </button>
                </div>

                {/* CURRENTLY SERVING */}
                {currentServing?.booking && (
                  <div className="mb-5 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm font-semibold text-green-700">
                      CURRENTLY SERVING
                    </p>

                    <p className="text-lg font-bold text-gray-800 mt-1">
                      Token #{currentServing.tokenNumber}
                    </p>

                    <p className="text-sm text-gray-600">
                      {currentServing.booking.farmer?.user?.name ||
                        currentServing.booking.farmer?.farmerCode ||
                        "Farmer"}
                    </p>

                    <button
                      onClick={() =>
                        handleSelectBooking(currentServing.booking)
                      }
                      className="mt-3 text-sm font-semibold text-green-700 hover:text-green-900"
                    >
                      Open Current Farmer →
                    </button>
                  </div>
                )}

                {/* QUEUE */}
                <div className="space-y-3">
                  {isQueueLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="p-4 border-2 rounded-lg border-gray-200 animate-pulse bg-gray-50 h-28" />
                    ))
                  ) : queue.length > 0 ? (
                    queue.map((entry) => (
                      <div
                        key={entry.id}
                        onClick={() => handleSelectBooking(entry.booking)}
                        className={`p-4 border-2 rounded-lg cursor-pointer transition ${
                          selectedBooking?.id === entry.bookingId
                            ? "border-green-500 bg-green-50"
                            : "border-gray-200 hover:border-green-400"
                        }`}
                      >
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <p className="font-bold text-lg">
                              Token #{entry.tokenNumber}
                            </p>

                            <p className="text-gray-600 text-sm">
                              {entry.booking?.farmer?.user?.name ||
                                entry.booking?.farmer?.farmerCode ||
                                "Farmer"}
                            </p>

                            <p className="text-gray-600 text-sm">
                              {entry.booking?.crop?.cropType} -{" "}
                              {entry.booking?.crop?.quantity}{" "}
                              {entry.booking?.crop?.unit}
                            </p>

                            {entry.booking?.slot && (
                              <p className="text-gray-500 text-xs mt-1">
                                {new Date(
                                  entry.booking.slot.slotDate,
                                ).toLocaleDateString("en-IN", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                })}{" "}
                                • {entry.booking.slot.startTime} -{" "}
                                {entry.booking.slot.endTime}
                              </p>
                            )}
                          </div>

                          <span
                            className={`shrink-0 px-3 py-1 rounded-full text-sm font-bold text-white ${
                              entry.status === "WAITING"
                                ? "bg-blue-500"
                                : entry.status === "CALLED"
                                  ? "bg-orange-500"
                                  : entry.status === "SERVING"
                                    ? "bg-green-500"
                                    : "bg-red-500"
                            }`}
                          >
                            {entry.status}
                          </span>
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

            {/* SELECTED BOOKING */}
            <div>
              {selectedBooking ? (
                <div className="bg-white rounded-lg shadow-lg p-6 sticky top-4">
                  <h2 className="text-2xl font-bold text-gray-800 mb-6">
                    Selected Booking
                  </h2>

                  <div className="space-y-5">
                    <div>
                      <p className="text-sm text-gray-600 font-bold">
                        FARMER NAME
                      </p>

                      <p className="font-bold text-lg">
                        {selectedBooking.farmer?.user?.name ||
                          selectedBooking.farmer?.farmerCode ||
                          "Farmer"}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-600 font-bold">BOOKING</p>

                      <p className="font-bold">
                        {selectedBooking.bookingNumber}
                      </p>
                    </div>

                    {/* BOOKING DATE & TIME */}
                    {selectedBooking.slot && (
                      <div>
                        <p className="text-sm text-gray-600 font-bold">
                          APPOINTMENT
                        </p>

                        <p className="font-bold">
                          {new Date(
                            selectedBooking.slot.slotDate,
                          ).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>

                        <p className="text-gray-700">
                          {selectedBooking.slot.startTime} -{" "}
                          {selectedBooking.slot.endTime}
                        </p>
                      </div>
                    )}

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

                    {/* START PROCESSING */}
                    {canProceedToProcessing && (
                      <button
                        onClick={handleProceedToProcessing}
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded-lg transition"
                      >
                        ▶ Proceed
                      </button>
                    )}

                    {/* NO SHOW / ABSENT */}
                    {canMarkNoShow && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleNoShow(selectedBooking.id)}
                          className="w-1/2 bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 rounded-lg transition"
                        >
                          Push Back
                        </button>
                        <button
                          onClick={() => handleAbsent(selectedBooking.id)}
                          className="w-1/2 bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded-lg transition"
                        >
                          Absent (Cancel)
                        </button>
                      </div>
                    )}

                    {/* PROCESSING BUTTON */}
                    {[
                      "SERVING",
                      "VERIFICATION",
                      "QUALITY_CHECK",
                      "WEIGHING",
                    ].includes(selectedStatus) && (
                      <button
                        onClick={() => setActiveTab("processing")}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg transition"
                      >
                        🔄 Open Processing
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-lg p-8 text-center text-gray-500">
                  <p>Select a farmer from the queue.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================================================= */}
        {/* PROCESSING TAB */}
        {/* ================================================= */}

        {activeTab === "processing" && selectedBooking && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* PROCESSING STEPS */}
            <div className="lg:col-span-2 space-y-8">
              {/* STEP INDICATOR */}
              <div className="bg-white rounded-lg shadow-lg p-5">
                <p className="font-bold text-gray-800 mb-4">
                  Procurement Progress
                </p>

                <div className="flex flex-wrap gap-2">
                  <span
                    className={`px-4 py-2 rounded-full text-sm font-bold ${
                      selectedStatus === "VERIFICATION"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    1. Quality
                  </span>

                  <span
                    className={`px-4 py-2 rounded-full text-sm font-bold ${
                      selectedStatus === "QUALITY_CHECK"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    2. Weighment
                  </span>

                  <span
                    className={`px-4 py-2 rounded-full text-sm font-bold ${
                      selectedStatus === "WEIGHING"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    3. Payment
                  </span>

                  <span
                    className={`px-4 py-2 rounded-full text-sm font-bold ${
                      selectedStatus === "PROCURED"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    4. Completed
                  </span>
                </div>
              </div>

              {/* QUALITY */}
              <div
                className={`bg-white rounded-lg shadow-lg p-6 ${
                  !canSubmitQuality ? "opacity-60" : ""
                }`}
              >
                <h2 className="text-2xl font-bold text-gray-800 mb-6">
                  1. Quality Check
                </h2>

                {!canSubmitQuality && (
                  <p className="text-sm text-gray-500 mb-4">
                    Proceed to processing before submitting the quality check.
                  </p>
                )}

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
                      disabled={!canSubmitQuality}
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
                      disabled={!canSubmitQuality}
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
                      min="0"
                      value={qualityForm.moisturePercentage}
                      onChange={(e) =>
                        setQualityForm({
                          ...qualityForm,
                          moisturePercentage: e.target.value,
                        })
                      }
                      disabled={!canSubmitQuality}
                      placeholder="e.g. 12.5"
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
                      disabled={!canSubmitQuality}
                      placeholder="Any additional notes..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      rows="3"
                    />
                  </div>

                  <button
                    onClick={handleSubmitQuality}
                    disabled={!canSubmitQuality}
                    className={`w-full font-bold py-2 rounded-lg transition ${
                      canSubmitQuality
                        ? "bg-blue-600 hover:bg-blue-700 text-white"
                        : "bg-gray-300 text-gray-500 cursor-not-allowed"
                    }`}
                  >
                    ✓ Submit Quality Check
                  </button>
                </div>
              </div>

              {/* WEIGHMENT */}
              <div
                className={`bg-white rounded-lg shadow-lg p-6 ${
                  !canSubmitWeighment ? "opacity-60" : ""
                }`}
              >
                <h2 className="text-2xl font-bold text-gray-800 mb-6">
                  2. Weighment
                </h2>

                {!canSubmitWeighment && (
                  <p className="text-sm text-gray-500 mb-4">
                    Complete the quality check first.
                  </p>
                )}

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
                      min="0"
                      value={weighmentForm.actualQuantity}
                      onChange={(e) =>
                        setWeighmentForm({
                          ...weighmentForm,
                          actualQuantity: e.target.value,
                        })
                      }
                      disabled={!canSubmitWeighment}
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
                      disabled={!canSubmitWeighment}
                      placeholder="Any notes about weighment..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      rows="2"
                    />
                  </div>

                  <button
                    onClick={handleSubmitWeighment}
                    disabled={!canSubmitWeighment}
                    className={`w-full font-bold py-2 rounded-lg transition ${
                      canSubmitWeighment
                        ? "bg-blue-600 hover:bg-blue-700 text-white"
                        : "bg-gray-300 text-gray-500 cursor-not-allowed"
                    }`}
                  >
                    ⚖️ Submit Weighment
                  </button>
                </div>
              </div>

              {/* PROCUREMENT */}
              <div
                className={`bg-white rounded-lg shadow-lg p-6 ${
                  !canCompleteProcurement ? "opacity-60" : ""
                }`}
              >
                <h2 className="text-2xl font-bold text-gray-800 mb-6">
                  3. Complete Procurement
                </h2>

                {!canCompleteProcurement && (
                  <p className="text-sm text-gray-500 mb-4">
                    Complete the weighment first.
                  </p>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-700 font-bold mb-2">
                      Procurement Amount
                    </label>

                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={procurementForm.procurementAmount}
                      onChange={(e) =>
                        setProcurementForm({
                          ...procurementForm,
                          procurementAmount: e.target.value,
                        })
                      }
                      disabled={!canCompleteProcurement}
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
                      disabled={!canCompleteProcurement}
                      placeholder="Final notes..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      rows="2"
                    />
                  </div>

                  <button
                    onClick={handleCompleteProcurement}
                    disabled={!canCompleteProcurement}
                    className={`w-full font-bold py-2 rounded-lg transition ${
                      canCompleteProcurement
                        ? "bg-green-600 hover:bg-green-700 text-white"
                        : "bg-gray-300 text-gray-500 cursor-not-allowed"
                    }`}
                  >
                    ✓ Complete Procurement
                  </button>
                </div>
              </div>
            </div>

            {/* PROCESSING SUMMARY */}
            <div className="bg-white rounded-lg shadow-lg p-6 sticky top-4 h-fit">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">
                Processing Summary
              </h2>

              <div className="space-y-5">
                <div>
                  <p className="text-sm text-gray-600 font-bold">BOOKING</p>

                  <p className="font-bold text-lg">
                    {selectedBooking.bookingNumber}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-600 font-bold">FARMER</p>

                  <p className="font-bold">
                    {selectedBooking.farmer?.user?.name ||
                      selectedBooking.farmer?.farmerCode ||
                      "Farmer"}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-600 font-bold">CROP</p>

                  <p className="font-bold">{selectedBooking.crop?.cropType}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600 font-bold">
                    EXPECTED QUANTITY
                  </p>

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

                <button
                  onClick={() => setActiveTab("queue")}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2 rounded-lg transition"
                >
                  ← Back to Queue
                </button>
              </div>
            </div>
          </div>
        )}

        {/* NO SELECTED BOOKING */}
        {activeTab === "processing" && !selectedBooking && (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <p className="text-gray-600 text-lg">
              Please select a booking from the queue to start processing.
            </p>

            <button
              onClick={() => setActiveTab("queue")}
              className="mt-4 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-5 rounded-lg"
            >
              Go to Queue
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default OperatorDashboard;
