import { beforeAll, describe, expect, test } from "bun:test";
import { unlinkSync, writeFileSync } from "node:fs";
import {
  decideGeminiCliCommand,
  executeGeminiAnalyzeFile,
  executeGeminiChat,
  executeListSessions,
} from "../../index.ts";

// Check if gemini-cli is available
let _isGeminiCliAvailable = false;

beforeAll(async () => {
  try {
    // await decideGeminiCliCommand(false);
    _isGeminiCliAvailable = true;
  } catch (error) {
    console.warn(
      "Gemini CLI not found, skipping integration tests that require it.",
      error,
    );
    _isGeminiCliAvailable = false;
  }
});

describe("Session Flow Integration Test", () => {
  const customSessionId = `test-session-${Date.now()}`;
  const testFilePath = `temp-test-file-${Date.now()}.txt`;

  beforeAll(() => {
    writeFileSync(
      testFilePath,
      "This is a simple test file content for analysis.",
    );
  });

  // Cleanup after tests
  test("Cleanup", () => {
    try {
      unlinkSync(testFilePath);
    } catch (_e) {
      // ignore
    }
  });

  test.if(_isGeminiCliAvailable)(
    "Full Session Flow",
    async () => {
      console.log(`Starting Session Flow Test with ID: ${customSessionId}`);

      // 1. Chat with custom Session ID
      console.log("Step 1: Execute Chat");
      let chatResult: string | undefined;
      try {
        chatResult = await executeGeminiChat({
          prompt: "Hello, remember this code: 12345",
          sessionId: customSessionId,
          model: "gemini-2.5-flash",
          yolo: true,
          sandbox: true,
        });
      } catch (error) {
        console.error("Step 1 Failed:", error);
        throw error;
      }
      expect(chatResult).toBeDefined();
      expect(typeof chatResult).toBe("string");
      console.log("Chat result received.");

      // 2. Verify Mapping in List Sessions
      console.log("Step 2: List Sessions");
      const listResult = await executeListSessions(false);
      expect(listResult.raw).toContain("Active Mappings");
      expect(listResult.raw).toContain(customSessionId);
      console.log("Mapping verified in listSessions output.");

      // 3. Analyze File with SAME Session ID
      // This verifies that the server can resolve the custom ID to the real ID
      // and pass it to the CLI (maintaining context, though hard to verify context strictly via CLI text output without multi-turn,
      // successful execution implies ID resolution worked).
      console.log("Step 3: Analyze File with Session ID");
      const analyzeResult = await executeGeminiAnalyzeFile({
        filePath: resolve(process.cwd(), testFilePath),
        prompt: "What is in this file? Also what is the code I told you?",
        sessionId: customSessionId,
        model: "gemini-2.5-flash",
        yolo: true,
        sandbox: true,
      });

      expect(analyzeResult).toBeDefined();
      // We don't strictly assert the answer contains "12345" because Gemini Flash might hallucinate or miss context in CLI ephemeral mode if not strictly persistent,
      // but the key success metric here is that it RAN without erroring on "invalid session id".
      console.log("Analyze result received.");
    },
    60000,
  ); // 60s timeout
});

import { resolve } from "node:path";
