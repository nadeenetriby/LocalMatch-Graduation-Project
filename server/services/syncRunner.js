import { spawn } from "child_process";
import { existsSync, readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { SyncLog } from "../models/SyncLog.js";
import { Brand } from "../models/Brand.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_ROOT = path.join(__dirname, "..");

let running = false;
let lastResult = null;

function classifyPipelineError(message = "") {
  const text = String(message || "").toLowerCase();
  const isMongoDnsError =
    text.includes("resolution lifetime expired") ||
    text.includes("configurationerror") ||
    text.includes("dns operation timed out") ||
    text.includes("mongodb+srv");

  if (isMongoDnsError) {
    const err = new Error(
      "Scraper could not reach MongoDB DNS (SRV). Check internet/DNS, or use a non-SRV MONGO_URI."
    );
    err.statusCode = 503;
    return err;
  }

  return null;
}

/** True when a venv python.exe exists and its base interpreter is present. */
function venvPythonUsable(exePath) {
  if (!existsSync(exePath)) return false;
  const cfgPath = path.join(path.dirname(exePath), "..", "pyvenv.cfg");
  if (!existsSync(cfgPath)) return true;
  try {
    const cfg = readFileSync(cfgPath, "utf8");
    const match = cfg.match(/^executable\s*=\s*(.+)$/m);
    if (match) {
      const base = match[1].trim();
      if (!existsSync(base)) return false;
    }
  } catch {
    return false;
  }
  return true;
}

/** @returns {{ cmd: string, prefixArgs: string[] }} */
function resolvePython() {
  const configured = process.env.SYNC_PYTHON?.trim();
  if (configured) {
    const isPath = configured.includes(path.sep) || configured.includes("/");
    if (!isPath || existsSync(configured)) {
      return { cmd: configured, prefixArgs: [] };
    }
    console.warn(`[syncRunner] SYNC_PYTHON not found (${configured}), using fallback`);
  }

  const venvCandidates =
    process.platform === "win32"
      ? [
          path.join(SERVER_ROOT, "venv", "Scripts", "python.exe"),
          path.join(SERVER_ROOT, "..", "venv", "Scripts", "python.exe"),
        ]
      : [
          path.join(SERVER_ROOT, "venv", "bin", "python"),
          path.join(SERVER_ROOT, "..", "venv", "bin", "python"),
        ];

  for (const candidate of venvCandidates) {
    if (venvPythonUsable(candidate)) {
      return { cmd: candidate, prefixArgs: [] };
    }
  }

  if (process.platform === "win32") {
    const localPython = path.join(
      process.env.LOCALAPPDATA || "",
      "Programs",
      "Python",
      "Python311",
      "python.exe"
    );
    if (existsSync(localPython)) {
      return { cmd: localPython, prefixArgs: [] };
    }
    return { cmd: "py", prefixArgs: ["-3.11"] };
  }

  return { cmd: "python3", prefixArgs: [] };
}

function runPython(args, timeoutMs) {
  return new Promise((resolve, reject) => {
    const { cmd, prefixArgs } = resolvePython();
    const child = spawn(cmd, [...prefixArgs, "-m", "data_pipeline.cli", ...args], {
      cwd: SERVER_ROOT,
      env: { ...process.env },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      stderr += text;
      process.stderr.write(text);
    });

    const timer =
      timeoutMs > 0
        ? setTimeout(() => {
            child.kill("SIGTERM");
            reject(new Error(`Sync timed out after ${timeoutMs}ms`));
          }, timeoutMs)
        : null;

    child.on("error", (err) => {
      if (timer) clearTimeout(timer);
      const label = prefixArgs.length ? `${cmd} ${prefixArgs.join(" ")}` : cmd;
      reject(new Error(`Failed to start Python (${label}): ${err.message}`));
    });

    child.on("close", (code) => {
      if (timer) clearTimeout(timer);
      const lines = stdout.trim().split("\n").filter(Boolean);
      const lastLine = lines[lines.length - 1] || "{}";
      let parsed;
      try {
        parsed = JSON.parse(lastLine);
      } catch {
        reject(
          new Error(
            `Invalid pipeline output (exit ${code}): ${stderr || stdout || "empty"}`
          )
        );
        return;
      }
      if (code !== 0 && !parsed.success) {
        reject(new Error(parsed.error || stderr || `Pipeline exited with code ${code}`));
        return;
      }
      resolve(parsed);
    });
  });
}

export function isSyncRunning() {
  return running;
}

export function getLastSyncResult() {
  return lastResult;
}

export async function validateBrandUrl(url) {
  try {
    const result = await runPython(["validate-url", "--url", url], 30000);
    return { ok: result.success, url: result.url, error: result.error };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

export async function runBrandSync(brandName, type = "admin") {
  if (running) {
    throw new Error("A sync is already in progress");
  }
  running = true;
  const timeout = Number(process.env.SYNC_TIMEOUT_MS) || 900000;

  try {
    console.log(`[syncRunner] admin-triggered scrape brand=${brandName}`);
    const result = await runPython(
      ["sync", "--brand", brandName, "--type", type],
      timeout
    );
    lastResult = { ...result, finishedAt: new Date() };
    return result;
  } catch (err) {
    const mapped = classifyPipelineError(err?.message);
    if (mapped) {
      throw mapped;
    }
    throw err;
  } finally {
    running = false;
  }
}

export async function runFullSync(type = "scheduled") {
  if (running) {
    console.warn("[syncRunner] skipping — sync already in progress");
    return { skipped: true };
  }

  running = true;
  const timeout = Number(process.env.SYNC_TIMEOUT_MS) || 7200000;
  const startedAt = new Date();

  const log = await SyncLog.create({
    type,
    startedAt,
    status: "running",
  });

  try {
    console.log(`[syncRunner] started type=${type}`);
    const result = await runPython(["sync", "--all", "--type", type], timeout);
    const stats = result.stats || {};
    const errors = stats.errors || [];
    const brandsFailed = stats.brandsFailed ?? errors.length;

    log.finishedAt = new Date();
    log.brandsTotal = stats.brandsTotal || 0;
    log.brandsFailed = brandsFailed;
    log.stats = {
      inserted: stats.inserted || 0,
      updated: stats.updated || 0,
      unavailable: stats.unavailable || 0,
      pages: stats.pages || 0,
    };
    log.brandErrors = errors;
    log.status =
      brandsFailed === 0 ? "success" : brandsFailed < log.brandsTotal ? "partial" : "failed";
    await log.save();

    lastResult = { ...result, logId: log._id, finishedAt: log.finishedAt };
    console.log(`[syncRunner] finished type=${type} status=${log.status}`);
    return result;
  } catch (err) {
    const mapped = classifyPipelineError(err?.message);
    if (mapped) {
      err = mapped;
    }
    // If the pipeline fails or times out, make sure we don't leave brands
    // permanently stuck in a "running" state from this sync attempt.
    try {
      await Brand.updateMany(
        { lastScrapeStatus: "running" },
        {
          $set: {
            lastScrapeStatus: "failed",
            lastScrapeError: err.message || "Sync interrupted",
          },
        }
      );
    } catch (brandErr) {
      console.error("[syncRunner] failed to reset running brands:", brandErr.message);
    }
    log.finishedAt = new Date();
    log.status = "failed";
    log.brandErrors = [{ brand: "", message: err.message }];
    await log.save();
    console.error(`[syncRunner] failed: ${err.message}`);
    throw err;
  } finally {
    running = false;
  }
}

export async function getSyncStatus() {
  const latest = await SyncLog.findOne().sort({ startedAt: -1 }).lean();
  return {
    running,
    lastResult,
    latestLog: latest,
  };
}

export async function setBrandRunning(brandId) {
  await Brand.findByIdAndUpdate(brandId, {
    lastScrapeStatus: "running",
    lastScrapeError: "",
  });
}
