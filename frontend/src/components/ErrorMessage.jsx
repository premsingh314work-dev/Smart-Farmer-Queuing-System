import React from "react";

export const ErrorMessage = ({ message }) => {
  if (!message) return null;

  return (
    <div
      className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4"
      role="alert"
    >
      <p className="text-sm">{message}</p>
    </div>
  );
};

export const FieldError = ({ error }) => {
  if (!error) return null;

  return <p className="text-red-500 text-sm mt-1">{error}</p>;
};
