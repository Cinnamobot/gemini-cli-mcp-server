/**
 * Types and utilities for streaming JSON output from gemini-cli.
 * Used with --output-format stream-json for real-time event monitoring.
 */

// Event types emitted by gemini-cli stream-json
export type StreamEventType =
  | "init"
  | "message"
  | "tool_use"
  | "tool_result"
  | "error"
  | "result";

// Base event structure
interface BaseStreamEvent {
  type: StreamEventType;
  timestamp: string;
}

// Session initialization event
export interface InitEvent extends BaseStreamEvent {
  type: "init";
  session_id: string;
  model: string;
}

// User/assistant message event
export interface MessageEvent extends BaseStreamEvent {
  type: "message";
  role: "user" | "assistant";
  content: string;
  delta?: boolean; // true if this is a streaming delta
}

// Tool call request event
export interface ToolUseEvent extends BaseStreamEvent {
  type: "tool_use";
  tool_name: string;
  tool_id: string;
  parameters: Record<string, unknown>;
}

// Tool execution result event
export interface ToolResultEvent extends BaseStreamEvent {
  type: "tool_result";
  tool_id: string;
  status: "success" | "error";
  output?: string;
  error?: string;
}

// Non-fatal error event
export interface ErrorEvent extends BaseStreamEvent {
  type: "error";
  message: string;
  code?: number;
}

// Final result event with aggregated stats
export interface ResultEvent extends BaseStreamEvent {
  type: "result";
  status: "success" | "error";
  stats?: {
    total_tokens?: number;
    input_tokens?: number;
    output_tokens?: number;
    duration_ms?: number;
    tool_calls?: number;
  };
}

// Union type for all stream events
export type StreamEvent =
  | InitEvent
  | MessageEvent
  | ToolUseEvent
  | ToolResultEvent
  | ErrorEvent
  | ResultEvent;

/**
 * Parse a single line of JSONL stream output
 */
export function parseStreamLine(line: string): StreamEvent | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  try {
    const event = JSON.parse(trimmed) as StreamEvent;
    // Validate that it has a type field
    if (!event.type) {
      return null;
    }
    return event;
  } catch {
    // Invalid JSON line, skip
    return null;
  }
}

/**
 * Parse complete JSONL output into array of events
 */
export function parseStreamOutput(output: string): StreamEvent[] {
  const lines = output.split("\n");
  const events: StreamEvent[] = [];

  for (const line of lines) {
    const event = parseStreamLine(line);
    if (event) {
      events.push(event);
    }
  }

  return events;
}

/**
 * Aggregated result from a streaming task
 */
export interface StreamingTaskResult {
  sessionId?: string;
  model?: string;
  events: StreamEvent[];
  toolCalls: {
    toolName: string;
    toolId: string;
    status: "success" | "error" | "pending";
    output?: string;
    error?: string;
  }[];
  finalResponse?: string;
  status: "success" | "error" | "unknown";
  stats?: ResultEvent["stats"];
  errors: string[];
}

/**
 * Aggregate stream events into a structured result
 */
export function aggregateStreamEvents(
  events: StreamEvent[],
): StreamingTaskResult {
  const result: StreamingTaskResult = {
    events,
    toolCalls: [],
    status: "unknown",
    errors: [],
  };

  // Map tool_id to index for matching results
  const toolIdToIndex = new Map<string, number>();

  for (const event of events) {
    switch (event.type) {
      case "init":
        result.sessionId = event.session_id;
        result.model = event.model;
        break;

      case "message":
        if (event.role === "assistant" && !event.delta) {
          result.finalResponse = event.content;
        } else if (event.role === "assistant" && event.delta) {
          // Accumulate delta responses
          result.finalResponse = (result.finalResponse || "") + event.content;
        }
        break;

      case "tool_use":
        toolIdToIndex.set(event.tool_id, result.toolCalls.length);
        result.toolCalls.push({
          toolName: event.tool_name,
          toolId: event.tool_id,
          status: "pending",
        });
        break;

      case "tool_result": {
        const index = toolIdToIndex.get(event.tool_id);
        if (index !== undefined) {
          result.toolCalls[index].status = event.status;
          result.toolCalls[index].output = event.output;
          result.toolCalls[index].error = event.error;
        }
        break;
      }

      case "error":
        result.errors.push(event.message);
        break;

      case "result":
        result.status = event.status;
        result.stats = event.stats;
        break;
    }
  }

  return result;
}
