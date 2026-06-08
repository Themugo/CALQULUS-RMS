import { describe, it, expect } from "vitest";
import { tenantSchema } from "@/shared/lib/validations";

describe("tenantSchema", () => {
  it("accepts valid tenant data", () => {
    const result = tenantSchema.safeParse({
      name: "John Doe",
      email: "john@example.com",
      property_id: "00000000-0000-0000-0000-000000000000",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing name", () => {
    const result = tenantSchema.safeParse({
      email: "john@example.com",
      property_id: "00000000-0000-0000-0000-000000000000",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const result = tenantSchema.safeParse({
      name: "John",
      email: "not-an-email",
      property_id: "00000000-0000-0000-0000-000000000000",
    });
    expect(result.success).toBe(false);
  });

  it("accepts optional phone in Kenyan format", () => {
    const result = tenantSchema.safeParse({
      name: "John",
      email: "john@example.com",
      phone: "0712345678",
      property_id: "00000000-0000-0000-0000-000000000000",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid phone format", () => {
    const result = tenantSchema.safeParse({
      name: "John",
      email: "john@example.com",
      phone: "12345",
      property_id: "00000000-0000-0000-0000-000000000000",
    });
    expect(result.success).toBe(false);
  });
});
