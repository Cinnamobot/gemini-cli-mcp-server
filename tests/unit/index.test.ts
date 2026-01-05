import { afterEach, describe, expect, mock, test } from "bun:test";
import {
  decideGeminiCliCommand,
  GeminiAnalyzeFileParametersSchema,
  GeminiChatParametersSchema,
  GoogleSearchParametersSchema,
} from "../../index.ts";

describe("Unit Tests: Zod Schemas", () => {
  describe("GoogleSearchParametersSchema", () => {
    test("validates valid input", () => {
      const input = {
        query: "test query",
        limit: 10,
        raw: true,
        sandbox: false,
        yolo: true,
        model: "gemini-2.5-pro",
      };
      const result = GoogleSearchParametersSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    test("validates input with minimal required fields", () => {
      const input = {
        query: "test query",
      };
      const result = GoogleSearchParametersSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    test("fails on missing required field", () => {
      const input = {
        limit: 10,
      };
      const result = GoogleSearchParametersSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    test("fails on invalid type", () => {
      const input = {
        query: 123, // should be string
      };
      const result = GoogleSearchParametersSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    test("validates input with sessionId", () => {
      const input = {
        query: "test query",
        sessionId: "test-session-id",
      };
      const result = GoogleSearchParametersSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  describe("GeminiChatParametersSchema", () => {
    test("validates valid input", () => {
      const input = {
        prompt: "Hello Gemini",
        sandbox: true,
        model: "gemini-2.5-flash",
      };
      const result = GeminiChatParametersSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    test("fails on missing required field", () => {
      const input = {
        sandbox: true,
      };
      const result = GeminiChatParametersSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe("GeminiAnalyzeFileParametersSchema", () => {
    test("validates valid input", () => {
      const input = {
        filePath: "/path/to/image.png",
        prompt: "Describe this",
      };
      const result = GeminiAnalyzeFileParametersSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    test("fails on missing filePath", () => {
      const input = {
        prompt: "Describe this",
      };
      const result = GeminiAnalyzeFileParametersSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });
});

// We can't easily mock top-level exports from the same module we are testing in ES modules without some tricks or dependency injection.
// However, we can test the logic of decideGeminiCliCommand when the executable is NOT found (if we assume the environment doesn't have it, or we rely on the npx flag).

describe("Unit Tests: Logic", () => {
  // Note: mocking findExecutable which is in the same file is hard with just bun:test imports.
  // So we verify the "npx" fallback behavior which is deterministic when allowNpx is true,
  // assuming findExecutable returns null or we can force it.
  // But since we can't easily force findExecutable to return null if it finds something on the host system,
  // we will focus on the schema tests above which are pure unit tests.

  // We can at least test that allowNpx=true returns SOMETHING (either local or npx).
  test("decideGeminiCliCommand returns a command", async () => {
    const result = await decideGeminiCliCommand(true);
    expect(result).toBeDefined();
    expect(result.command).toBeDefined();
  });
});
