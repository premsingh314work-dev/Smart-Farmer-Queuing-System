import test from "node:test";
import assert from "node:assert/strict";

import { createAuthToken, verifyAuthToken } from "../src/utils/auth.js";
import {
  validateRegisterInput,
  validateLoginInput,
} from "../src/utils/validators.js";

test("createAuthToken signs a valid JWT payload", () => {
  const token = createAuthToken({ id: "user-123", role: "FARMER" });

  assert.ok(token);
  assert.equal(typeof token, "string");
  assert.ok(token.split(".").length === 3);
});

test("verifyAuthToken decodes a valid token", () => {
  const token = createAuthToken({
    id: "user-123",
    role: "FARMER",
    phone: "9876543210",
  });
  const payload = verifyAuthToken(token);

  assert.equal(payload.id, "user-123");
  assert.equal(payload.role, "FARMER");
  assert.equal(payload.phone, "9876543210");
});

test("register input validation rejects missing required fields", () => {
  const result = validateRegisterInput({
    name: "Prem Singh",
    phone: "9876543210",
    password: "StrongPassword123",
  });

  assert.equal(result.isValid, false);
  assert.ok(result.errors.some((error) => error.field === "district"));
});

test("login input validation accepts valid payload", () => {
  const result = validateLoginInput({
    phone: "9876543210",
    password: "StrongPassword123",
  });

  assert.equal(result.isValid, true);
});
