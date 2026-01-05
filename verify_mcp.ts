import { spawn } from "node:child_process";
import { createInterface } from "node:readline";

const serverProcess = spawn("bun", ["run", "index.ts"], {
  stdio: ["pipe", "pipe", "inherit"],
});

const rl = createInterface({
  input: serverProcess.stdout,
  terminal: false,
});

let step = 0;

console.log("Starting MCP Server verification...");

const send = (msg: unknown) => {
  const json = JSON.stringify(msg);
  console.log(`Sending: ${json}`);
  serverProcess.stdin.write(`${json}\n`);
};

rl.on("line", (line) => {
  console.log(`Received: ${line}`);
  try {
    const msg = JSON.parse(line);

    if (step === 0) {
      // Initialize response
      if (msg.id === 1 && msg.result) {
        console.log("✅ Initialize successful");
        send({
          jsonrpc: "2.0",
          method: "notifications/initialized",
        });

        // Request tools list
        send({
          jsonrpc: "2.0",
          id: 2,
          method: "tools/list",
        });
        step = 1;
      } else {
        console.error("❌ Initialize failed or unexpected message");
        process.exit(1);
      }
    } else if (step === 1) {
      // Tools list response
      if (msg.id === 2 && msg.result && msg.result.tools) {
        console.log("✅ Tools list received");
        console.log(
          "Tools found:",
          msg.result.tools.map((t: { name: string }) => t.name).join(", "),
        );
        process.exit(0);
      } else {
        console.error("❌ Tools list failed or unexpected message");
        process.exit(1);
      }
    }
  } catch (_e) {
    console.error(`Failed to parse JSON: ${line}`);
  }
});

// Start initialization
send({
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: {
      name: "verification-script",
      version: "1.0.0",
    },
  },
});

setTimeout(() => {
  console.error("❌ Timeout");
  process.exit(1);
}, 10000);
