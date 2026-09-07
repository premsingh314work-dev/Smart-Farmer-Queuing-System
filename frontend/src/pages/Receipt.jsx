import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { receiptsAPI } from "../api/client";

export const Receipt = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();

  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchReceipt = async () => {
      try {
        const response = await receiptsAPI.getByBooking(bookingId);

        setReceipt(response.data.data || response.data);
      } catch (err) {
        console.error("Failed to load receipt:", err);

        setError(
          err.response?.data?.message ||
            "Unable to load receipt. Please try again.",
        );
      } finally {
        setLoading(false);
      }
    };

    if (bookingId) {
      fetchReceipt();
    }
  }, [bookingId]);

  const formatDate = (date) => {
    if (!date) return "N/A";

    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatDateTime = (date) => {
    if (!date) return "N/A";

    return new Date(date).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">Loading receipt...</p>
      </div>
    );
  }

  if (error || !receipt) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-lg shadow-md p-8 text-center max-w-md">
          <h2 className="text-xl font-bold text-red-600 mb-3">
            Receipt Unavailable
          </h2>

          <p className="text-gray-600 mb-6">
            {error || "Receipt could not be found."}
          </p>

          <button
            onClick={() => navigate("/bookings")}
            className="bg-green-600 text-white px-5 py-2 rounded-md hover:bg-green-700 transition"
          >
            Back to Bookings
          </button>
        </div>
      </div>
    );
  }

  const farmer = receipt.farmer;
  const booking = receipt.booking;
  const crop = receipt.crop;
  const centre = receipt.centre;
  const slot = receipt.slot;
  const quality = receipt.quality;
  const weighment = receipt.weighment;
  const procurement = receipt.procurement;

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      {/* Action Buttons */}
      <div className="no-print max-w-4xl mx-auto mb-6 flex justify-between items-center">
        <button
          onClick={() => navigate("/bookings")}
          className="text-blue-600 hover:text-blue-800 font-medium transition"
        >
          ← Back to Bookings
        </button>

        <button
          onClick={handlePrint}
          className="bg-green-600 text-white px-5 py-2 rounded-md hover:bg-green-700 transition font-medium"
        >
          🖨️ Print Receipt
        </button>
      </div>

      {/* Receipt */}
      <div className="receipt max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-6 md:p-10">
        {/* Header */}
        <div className="text-center border-b-2 border-green-600 pb-6 mb-6">
          <h1 className="text-3xl font-bold text-green-700">KisanSetu</h1>

          <p className="text-xl font-semibold text-gray-800 mt-2">
            PROCUREMENT RECEIPT
          </p>

          <div className="flex flex-col md:flex-row justify-between gap-2 mt-4 text-sm text-gray-600">
            <p>
              <span className="font-semibold">Receipt No:</span>{" "}
              {receipt.receiptNumber || booking.bookingNumber}
            </p>

            <p>
              <span className="font-semibold">Date:</span>{" "}
              {formatDate(procurement?.completedAt || receipt.createdAt)}
            </p>
          </div>
        </div>

        {/* Procurement Status */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 text-center">
          <p className="text-green-700 font-bold text-lg">
            ✓ PROCUREMENT COMPLETED
          </p>
        </div>

        {/* Farmer Details */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-gray-800 border-b pb-2 mb-4">
            Farmer Details
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Farmer Name</p>
              <p className="font-medium">{farmer?.name || "N/A"}</p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Farmer Code</p>
              <p className="font-medium">{farmer?.farmerCode || "N/A"}</p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Village</p>
              <p className="font-medium">{farmer?.village || "N/A"}</p>
            </div>

            <div>
              <p className="text-sm text-gray-500">District</p>
              <p className="font-medium">{farmer?.district || "N/A"}</p>
            </div>

            <div>
              <p className="text-sm text-gray-500">State</p>
              <p className="font-medium">{farmer?.state || "N/A"}</p>
            </div>
          </div>
        </section>

        {/* Booking Details */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-gray-800 border-b pb-2 mb-4">
            Booking Details
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Booking Number</p>
              <p className="font-medium">{booking?.bookingNumber || "N/A"}</p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Token Number</p>
              <p className="font-medium">{booking?.tokenNumber ?? "N/A"}</p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Centre</p>
              <p className="font-medium">{centre?.name || "N/A"}</p>
            </div>

            {/* <div>
              <p className="text-sm text-gray-500">Season</p>
              <p className="font-medium">{crop?.season || "N/A"}</p>
            </div> */}

            <div>
              <p className="text-sm text-gray-500">Scheduled Date</p>
              <p className="font-medium">{formatDate(slot?.date)}</p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Time</p>
              <p className="font-medium">
                {slot?.startTime || "N/A"} - {slot?.endTime || "N/A"}
              </p>
            </div>
          </div>
        </section>

        {/* Crop Details */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-gray-800 border-b pb-2 mb-4">
            Crop Details
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Crop</p>
              <p className="font-medium">{crop?.cropType || "N/A"}</p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Expected Quantity</p>
              <p className="font-medium">
                {weighment?.expectedQuantity ?? crop?.quantity ?? "N/A"}{" "}
                {weighment?.unit || crop?.unit || ""}
              </p>
            </div>
          </div>
        </section>

        {/* Quality Details */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-gray-800 border-b pb-2 mb-4">
            Quality Details
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Quality Status</p>
              <p className="font-medium">{quality?.status || "N/A"}</p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Grade</p>
              <p className="font-medium">{quality?.grade || "N/A"}</p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Moisture</p>
              <p className="font-medium">
                {quality?.moisturePercentage != null
                  ? `${quality.moisturePercentage}%`
                  : "N/A"}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Remarks</p>
              <p className="font-medium">{quality?.remarks || "N/A"}</p>
            </div>
          </div>
        </section>

        {/* Weighment */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-gray-800 border-b pb-2 mb-4">
            Weighment Details
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Expected Quantity</p>
              <p className="font-medium">
                {weighment?.expectedQuantity ?? "N/A"} {weighment?.unit || ""}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Actual Quantity</p>
              <p className="font-medium">
                {weighment?.actualQuantity ?? "N/A"} {weighment?.unit || ""}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Weighed At</p>
              <p className="font-medium">
                {formatDateTime(weighment?.measuredAt)}
              </p>
            </div>
          </div>
        </section>

        {/* Procurement */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-gray-800 border-b pb-2 mb-4">
            Procurement Details
          </h2>

          <div className="bg-gray-50 rounded-lg p-5">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 font-medium">
                Procurement Amount
              </span>

              <span className="text-2xl font-bold text-green-700">
                ₹{procurement?.amount ?? "0"}
              </span>
            </div>

            <div className="mt-4 text-sm text-gray-600">
              <p>
                <span className="font-semibold">Completed At:</span>{" "}
                {formatDateTime(procurement?.completedAt)}
              </p>

              {procurement?.remarks && (
                <p className="mt-2">
                  <span className="font-semibold">Remarks:</span>{" "}
                  {procurement.remarks}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Footer */}
        <div className="border-t pt-6 text-center text-sm text-gray-500">
          <p className="font-medium text-gray-700">
            This is a digitally generated procurement receipt.
          </p>

          <p className="mt-1">
            KisanSetu — Smart Farmer Procurement & Queue Management
          </p>
        </div>
      </div>

      {/* Print CSS */}
      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }

          body {
            background: white !important;
          }

          .receipt {
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            max-width: none !important;
          }
        }
      `}</style>
    </div>
  );
};
