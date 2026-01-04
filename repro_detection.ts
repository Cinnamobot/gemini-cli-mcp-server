import { existsSync, statSync } from "node:fs";
import { join } from "node:path";

function findExecutable(name: string): string | null {
  const isWindows = process.platform === "win32";
  const pathEnv = process.env.PATH || "";
  const pathDirs = pathEnv.split(isWindows ? ";" : ":");

  // On Windows, get executable extensions from PATHEXT
  // Default: .COM;.EXE;.BAT;.CMD;.VBS;.VBE;.JS;.JSE;.WSF;.WSH;.MSC
  const pathExtList = isWindows
    ? (process.env.PATHEXT || ".COM;.EXE;.BAT;.CMD").toLowerCase().split(";")
    : [""];

  console.log(`Platform: ${process.platform}`);
  console.log(`PATHEXT: ${pathExtList.join(", ")}`);
  console.log(`Searching for: ${name}`);

  for (const dir of pathDirs) {
    if (!dir) continue;

    for (const ext of pathExtList) {
      const fullPath = join(dir, name + ext);
      // console.log(`Checking: ${fullPath}`); // Commented out to reduce noise, enable if needed
      try {
        if (existsSync(fullPath)) {
          const stat = statSync(fullPath);
          if (stat.isFile()) {
            if (!isWindows) {
              if ((stat.mode & 0o111) === 0) continue;
            }
            console.log(`FOUND: ${fullPath}`);
            return fullPath;
          }
        }
      } catch {
        // Ignore errors
      }
    }
  }

  console.log("NOT FOUND");
  return null;
}

findExecutable("gemini");
