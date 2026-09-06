export function normalizePhone(phone = "") {
  return String(phone)
    .replace(/[^\d+]/g, "")
    .trim();
}

export function validateRegisterInput(payload = {}) {
  const errors = [];
  const {
    name,
    phone,
    email,
    password,
    village,
    district,
    state,
    preferred_language,
  } = payload;

  if (!name || String(name).trim().length < 2) {
    errors.push({
      field: "name",
      message: "Name is required and must be at least 2 characters long.",
    });
  }

  if (!phone || normalizePhone(phone).length < 10) {
    errors.push({
      field: "phone",
      message: "A valid phone number is required.",
    });
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim())) {
    errors.push({
      field: "email",
      message: "Email must be a valid email address.",
    });
  }

  if (!password || String(password).length < 8) {
    errors.push({
      field: "password",
      message: "Password must be at least 8 characters long.",
    });
  }

  if (!village || String(village).trim().length < 2) {
    errors.push({ field: "village", message: "Village is required." });
  }

  if (!district || String(district).trim().length < 2) {
    errors.push({ field: "district", message: "District is required." });
  }

  if (!state || String(state).trim().length < 2) {
    errors.push({ field: "state", message: "State is required." });
  }

  if (
    preferred_language &&
    !["en", "hi", "pa", "mr"].includes(
      String(preferred_language).trim().toLowerCase(),
    )
  ) {
    errors.push({
      field: "preferred_language",
      message: "Preferred language must be one of: en, hi, pa, mr.",
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validateLoginInput(payload = {}) {
  const errors = [];
  const { phone, password } = payload;

  if (!phone || normalizePhone(phone).length < 10) {
    errors.push({
      field: "phone",
      message: "A valid phone number is required.",
    });
  }

  if (!password || String(password).length < 8) {
    errors.push({
      field: "password",
      message: "Password must be at least 8 characters long.",
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
