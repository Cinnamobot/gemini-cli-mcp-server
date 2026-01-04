import { test } from "bun:test";
import { findExecutable } from "../index.ts";

test("debug environment", () => {
  console.log("--- DEBUG ENV START ---");
  console.log(`PATH: ${process.env.PATH}`);
  console.log(`PATHEXT: ${process.env.PATHEXT}`);
  const found = findExecutable("gemini");
  console.log(`Found gemini: ${found}`);
  console.log("--- DEBUG ENV END ---");
});
