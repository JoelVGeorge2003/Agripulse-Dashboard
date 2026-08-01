import { spawn } from "node:child_process";

const commands = [
  ["shared", ["run", "dev", "-w", "@agripulse/shared"]],
  ["backend", ["run", "dev", "-w", "@agripulse/backend"]],
  ["frontend", ["run", "dev", "-w", "@agripulse/frontend"]]
];

const children = commands.map(([name, args]) => {
  const child = spawn("npm", args, {
    stdio: "inherit",
    shell: process.platform === "win32"
  });
  child.on("exit", (code, signal) => {
    if (signal || code === 0) return;
    console.error(`[${name}] exited with code ${code}`);
    shutdown(code ?? 1);
  });
  return child;
});

let shuttingDown = false;
function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) child.kill("SIGTERM");
  }
  setTimeout(() => process.exit(exitCode), 250).unref();
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
