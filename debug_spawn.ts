import { spawn } from "node:child_process";

const executable = "C:\\Program Files\\nodejs\\gemini.cmd";
// Quote the executable path because it has spaces
const quotedExecutable = `"${executable}"`;

console.log(`Spawning cmd.exe /c ${executable} with complex args`);

console.log(`Spawning with shell: true: "${executable}"`);

const prompt = 'Search for: "test search" and return JSON';
// Note: Manually quoting the command because shell: true doesn't do it for command path
const child = spawn(`"${executable}"`, ["-p", prompt], {
  stdio: ["pipe", "pipe", "pipe"],
  shell: true,
});

child.stdout.on("data", (d) => console.log("STDOUT:", d.toString()));
child.stderr.on("data", (d) => console.log("STDERR:", d.toString()));

child.on("error", (err) => console.error("SPAWN ERROR:", err));
child.on("close", (code) => console.log("EXIT CODE:", code));
