import React from "react";

export const ReceiptModal = ({ receipt, onClose }) => {
  if (!receipt) return null;

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

  return (
    <>
      {/* Dark overlay */}
      <div className="receipt-modal-overlay fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4">
        {/* Modal */}
        <div className="receipt-modal bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col">
          {/* Modal Header */}
          <div className="no-print flex items-center justify-between px-6 py-4 border-b bg-gray-50">
            <div>
              <h2 className="text-xl font-bold text-gray-800">
                Procurement Receipt
              </h2>
              <p className="text-sm text-gray-500">
                Procurement completed successfully
              </p>
            </div>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-red-500 hover:bg-red-600 text-white text-xl font-bold transition"
              title="Close"
            >
              ×
            </button>
          </div>

          {/* Receipt Content */}
          <div className="overflow-y-auto p-5 md:p-8">
            <div className="receipt-content border border-gray-200 rounded-lg p-6 md:p-10">
              {/* Header */}
              <div className="text-center border-b-2 border-green-600 pb-6 mb-6">
                <h1 className="text-3xl font-bold text-green-700">KisanSetu</h1>

                <p className="text-xl font-semibold text-gray-800 mt-2">
                  PROCUREMENT RECEIPT
                </p>

                <div className="flex flex-col md:flex-row justify-between gap-2 mt-4 text-sm text-gray-600">
                  <p>
                    <span className="font-semibold">Receipt No:</span>{" "}
                    {receipt.receiptNumber}
                  </p>

                  <p>
                    <span className="font-semibold">Date:</span>{" "}
                    {formatDate(receipt.completedAt)}
                  </p>
                </div>
              </div>

              {/* Success */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 text-center">
                <p className="text-green-700 font-bold text-lg">
                  ✓ PROCUREMENT COMPLETED
                </p>
              </div>

              {/* Farmer Details */}
              <section className="mb-7">
                <h3 className="text-lg font-bold text-gray-800 border-b pb-2 mb-4">
                  Farmer Details
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Farmer Name</p>
                    <p className="font-medium">{receipt.farmerName || "N/A"}</p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500">Farmer Code</p>
                    <p className="font-medium">{receipt.farmerCode || "N/A"}</p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500">Village</p>
                    <p className="font-medium">{receipt.village || "N/A"}</p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500">District</p>
                    <p className="font-medium">{receipt.district || "N/A"}</p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500">State</p>
                    <p className="font-medium">{receipt.state || "N/A"}</p>
                  </div>
                </div>
              </section>

              {/* Booking Details */}
              <section className="mb-7">
                <h3 className="text-lg font-bold text-gray-800 border-b pb-2 mb-4">
                  Booking Details
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Booking Number</p>
                    <p className="font-medium">
                      {receipt.bookingNumber || "N/A"}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500">Token Number</p>
                    <p className="font-medium">
                      {receipt.tokenNumber ?? "N/A"}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500">Centre</p>
                    <p className="font-medium">{receipt.centreName || "N/A"}</p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500">Scheduled Date</p>
                    <p className="font-medium">
                      {formatDate(receipt.slotDate)}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500">Time</p>
                    <p className="font-medium">
                      {receipt.startTime || "N/A"} - {receipt.endTime || "N/A"}
                    </p>
                  </div>
                </div>
              </section>

              {/* Crop Details */}
              <section className="mb-7">
                <h3 className="text-lg font-bold text-gray-800 border-b pb-2 mb-4">
                  Crop Details
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Crop</p>
                    <p className="font-medium">{receipt.cropType || "N/A"}</p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500">Expected Quantity</p>
                    <p className="font-medium">
                      {receipt.expectedQuantity || "N/A"} {receipt.unit || ""}
                    </p>
                  </div>
                </div>
              </section>

              {/* Quality */}
              <section className="mb-7">
                <h3 className="text-lg font-bold text-gray-800 border-b pb-2 mb-4">
                  Quality Details
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Quality Status</p>
                    <p className="font-medium">
                      {receipt.qualityStatus || "N/A"}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500">Grade</p>
                    <p className="font-medium">{receipt.grade || "N/A"}</p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500">Moisture</p>
                    <p className="font-medium">
                      {receipt.moisturePercentage
                        ? `${receipt.moisturePercentage}%`
                        : "N/A"}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500">Remarks</p>
                    <p className="font-medium">
                      {receipt.qualityRemarks || "N/A"}
                    </p>
                  </div>
                </div>
              </section>

              {/* Weighment */}
              <section className="mb-7">
                <h3 className="text-lg font-bold text-gray-800 border-b pb-2 mb-4">
                  Weighment Details
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Expected Quantity</p>
                    <p className="font-medium">
                      {receipt.expectedQuantity || "N/A"} {receipt.unit || ""}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500">Actual Quantity</p>
                    <p className="font-medium">
                      {receipt.actualQuantity || "N/A"} {receipt.unit || ""}
                    </p>
                  </div>
                </div>
              </section>

              {/* Procurement */}
              <section className="mb-7">
                <h3 className="text-lg font-bold text-gray-800 border-b pb-2 mb-4">
                  Procurement Details
                </h3>

                <div className="bg-green-50 rounded-lg p-5">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700 font-semibold">
                      Procurement Amount
                    </span>

                    <span className="text-2xl font-bold text-green-700">
                      ₹{receipt.procurementAmount || "0"}
                    </span>
                  </div>

                  {receipt.procurementRemarks && (
                    <p className="mt-3 text-sm text-gray-600">
                      <span className="font-semibold">Remarks:</span>{" "}
                      {receipt.procurementRemarks}
                    </p>
                  )}
                </div>
              </section>

              {/* Footer */}
              <div className="border-t pt-5 text-center text-sm text-gray-500">
                <p className="font-medium text-gray-700">
                  This is a digitally generated procurement receipt.
                </p>

                <p className="mt-1">
                  KisanSetu — Smart Farmer Procurement & Queue Management
                </p>
              </div>
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="no-print border-t bg-gray-50 px-6 py-4 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 font-semibold transition"
            >
              Close
            </button>

            <button
              onClick={handlePrint}
              className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition"
            >
              🖨️ Print Receipt
            </button>
          </div>
        </div>
      </div>

      {/* Print CSS */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }

          .receipt-content,
          .receipt-content * {
            visibility: visible;
          }

          .receipt-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            border: none !important;
            padding: 20px !important;
          }

          .no-print {
            display: none !important;
          }

          .receipt-modal-overlay {
            position: static !important;
            background: white !important;
            padding: 0 !important;
          }

          .receipt-modal {
            max-height: none !important;
            max-width: none !important;
            box-shadow: none !important;
            overflow: visible !important;
          }
        }
      `}</style>
    </>
  );
};

export default ReceiptModal;
