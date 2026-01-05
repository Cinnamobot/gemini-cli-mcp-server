import { describe, expect, it, mock } from "bun:test";
import { SessionManager } from "../session_manager.js";

describe("SessionManager", () => {
  it("should store and retrieve session IDs", () => {
    const manager = new SessionManager();
    manager.setSessionId("client-1", "real-1");
    expect(manager.getSessionId("client-1")).toBe("real-1");
    expect(manager.getSessionId("client-2")).toBeUndefined();
  });

  it("should return all mappings", () => {
    const manager = new SessionManager();
    manager.setSessionId("c1", "r1");
    manager.setSessionId("c2", "r2");
    const mappings = manager.getAllMappings();
    expect(mappings).toEqual({ c1: "r1", c2: "r2" });
  });

  it("should resolve existing session immediately", async () => {
    const manager = new SessionManager();
    manager.setSessionId("c1", "r1");

    const listFn = mock(async () => ["r1", "r2"]);
    const startFn = mock(async () => {});

    const result = await manager.resolveSession("c1", listFn, startFn);

    expect(result).toBe("r1");
    expect(listFn).not.toHaveBeenCalled();
    expect(startFn).not.toHaveBeenCalled();
  });

  it("should create new mapping if session not found", async () => {
    const manager = new SessionManager();

    // Mocking listSessions: first call returns [], second call returns ["new-id"]
    let callCount = 0;
    const listFn = mock(async () => {
      callCount++;
      if (callCount === 1) return ["existing-1"];
      return ["existing-1", "new-id"];
    });

    const startFn = mock(async () => {
      // Emulate delay or side effect
    });

    const result = await manager.resolveSession("new-client", listFn, startFn);

    expect(result).toBe("new-id");
    expect(listFn).toHaveBeenCalledTimes(2);
    expect(startFn).toHaveBeenCalledTimes(1);
    expect(manager.getSessionId("new-client")).toBe("new-id");
  });

  it("should throw error if no new session created", async () => {
    const manager = new SessionManager();
    const listFn = mock(async () => ["existing-1"]);
    const startFn = mock(async () => {});

    expect(async () => {
      await manager.resolveSession("fail-client", listFn, startFn);
    }).toThrow(
      "Failed to map session 'fail-client': No new session created by Gemini CLI.",
    );
  });
});
