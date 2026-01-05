import { beforeAll, describe, expect, test } from "bun:test";
import {
  decideGeminiCliCommand,
  executeGeminiChat,
  executeGeminiCli,
  executeGoogleSearch,
  executeListSessions,
  parseSessionsOutput,
} from "../../index.ts";

// Check if gemini-cli is available
let isGeminiCliAvailable = false;

beforeAll(async () => {
  try {
    await decideGeminiCliCommand(false);
    isGeminiCliAvailable = true;
  } catch {
    isGeminiCliAvailable = false;
  }
});

describe("MCP Gemini CLI Integration Tests", () => {
  describe("gemini-cli detection", () => {
    test("decideGeminiCliCommand finds gemini-cli or falls back correctly", async () => {
      try {
        // Test without npx fallback
        const cmdWithoutNpx = await decideGeminiCliCommand(false);
        // findExecutable returns full path, so check if it contains "gemini"
        expect(cmdWithoutNpx.command).toContain("gemini");
        expect(cmdWithoutNpx.initialArgs).toEqual([]);
      } catch (error) {
        // If gemini-cli is not installed, it should throw the expected error
        expect(error instanceof Error && error.message).toContain("gemini");
      }

      // Test with npx fallback
      const cmdWithNpx = await decideGeminiCliCommand(true);
      // Command is either full path containing "gemini" or "npx"
      const isGemini = cmdWithNpx.command.includes("gemini");
      const isNpx = cmdWithNpx.command === "npx";
      expect(isGemini || isNpx).toBe(true);
      if (isNpx) {
        expect(cmdWithNpx.initialArgs).toEqual([
          "https://github.com/google-gemini/gemini-cli",
        ]);
      }
    });

    test.if(isGeminiCliAvailable)(
      "executeGeminiCli handles errors correctly",
      async () => {
        try {
          // Try to execute a command that will likely fail
          const result = await executeGeminiCli(
            { command: "gemini", initialArgs: [] },
            ["--invalid-flag-that-does-not-exist"],
          );
          // If it somehow succeeds, check that we got a string
          expect(typeof result).toBe("string");
        } catch (error) {
          // This is expected to fail
          expect(error).toBeInstanceOf(Error);
          expect(error instanceof Error && error.message).toMatch(
            /gemini exited with code|Executable not found/,
          );
        }
      },
      30000,
    );
  });

  describe("tool execution", () => {
    test.if(isGeminiCliAvailable)(
      "googleSearchTool executes without error",
      async () => {
        const result = await executeGoogleSearch({
          query: "test search",
          limit: 3,
          raw: true,
          sandbox: true,
          yolo: true, // Auto-accept to avoid hanging
          model: "gemini-2.5-flash",
        });

        // Check that we got some result
        expect(result).toBeDefined();
        expect(typeof result).toBe("string");
      },
      30000,
    ); // 30 second timeout

    test.if(isGeminiCliAvailable)(
      "chatTool executes without error",
      async () => {
        const result = await executeGeminiChat({
          prompt: "Say hello",
          sandbox: true,
          yolo: true, // Auto-accept to avoid hanging
          model: "gemini-2.5-flash",
        });

        // Check that we got a response
        expect(result).toBeDefined();
        expect(typeof result).toBe("string");
      },
      30000,
    ); // 30 second timeout

    if (!isGeminiCliAvailable) {
      test("gemini-cli not available", () => {
        expect(true).toBe(true);
      });
    }
  });

  describe("session management", () => {
    test("parseSessionsOutput parses session list correctly", () => {
      const sampleOutput = `1. Empty conversation (13 days ago) [54e41765-c1b4-43ef-a66b-b707e519]
2. こんにちはテスト (14 minutes ago) [9ec64691-53cb-4fa3-b7df-a121b6dcef54]
3. Project discussion (2 hours ago) [abc12345-abcd-1234-ef56-7890abcdef12]
`;
      const sessions = parseSessionsOutput(sampleOutput);

      expect(sessions).toHaveLength(3);

      expect(sessions[0].title).toBe("Empty conversation");
      expect(sessions[0].age).toBe("13 days ago");
      expect(sessions[0].sessionId).toBe("54e41765-c1b4-43ef-a66b-b707e519");

      expect(sessions[1].title).toBe("こんにちはテスト");
      expect(sessions[1].age).toBe("14 minutes ago");
      expect(sessions[1].sessionId).toBe(
        "9ec64691-53cb-4fa3-b7df-a121b6dcef54",
      );

      expect(sessions[2].title).toBe("Project discussion");
      expect(sessions[2].age).toBe("2 hours ago");
      expect(sessions[2].sessionId).toBe(
        "abc12345-abcd-1234-ef56-7890abcdef12",
      );
    });

    test("parseSessionsOutput handles empty output", () => {
      const sessions = parseSessionsOutput("");
      expect(sessions).toHaveLength(0);
    });

    test("parseSessionsOutput handles malformed lines", () => {
      const sampleOutput = `Some header text
1. Valid session (1 day ago) [valid-session-id]
Invalid line without brackets
Another invalid line
2. Another valid (2 days ago) [another-id]`;
      const sessions = parseSessionsOutput(sampleOutput);

      expect(sessions).toHaveLength(2);
      expect(sessions[0].title).toBe("Valid session");
      expect(sessions[1].title).toBe("Another valid");
    });

    test.if(isGeminiCliAvailable)(
      "executeListSessions returns structured data",
      async () => {
        const result = await executeListSessions(false);

        expect(result).toBeDefined();
        expect(result.raw).toBeDefined();
        expect(typeof result.raw).toBe("string");
        expect(Array.isArray(result.sessions)).toBe(true);
      },
      30000,
    ); // 30 second timeout
  });
});
