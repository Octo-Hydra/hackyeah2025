import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import chokidar from "chokidar";
import type { FSWatcher } from "chokidar";
import type { NextConfig } from "next";

type ZeusPluginOptions = {
  input: string;
  output: string;
  args?: string[];
};

declare global {
  var __zeusWatcher: FSWatcher | undefined;
  var __zeusCleanupRegistered: boolean | undefined;
  var __zeusGenerationInFlight: Promise<void> | undefined;
  var __zeusGenerationBusy: boolean | undefined;
  var __zeusGenerationQueued: boolean | undefined;
  var __zeusInitialized: boolean | undefined;
}

const ZEUS_LOG_PREFIX = "[zeus]";

const logInfo = (...message: unknown[]) => {
  console.log(ZEUS_LOG_PREFIX, ...message);
};

const logError = (...message: unknown[]) => {
  console.error(ZEUS_LOG_PREFIX, ...message);
};

const runGraphQLZeus = (commandArgs: string[]) =>
  new Promise<void>((resolve, reject) => {
    const child = spawn("npx", ["graphql-zeus", ...commandArgs], {
      stdio: "inherit",
      shell: process.platform === "win32",
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`graphql-zeus exited with code ${code ?? "unknown"}`));
      }
    });
  });

const runGraphQLZeusSync = (commandArgs: string[]) => {
  const { status, error } = spawnSync("npx", ["graphql-zeus", ...commandArgs], {
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  if (error) {
    throw error;
  }

  if (status !== 0) {
    throw new Error(`graphql-zeus exited with code ${status ?? "unknown"}`);
  }
};

const ensureCleanup = () => {
  if (globalThis.__zeusCleanupRegistered) {
    return;
  }

  const cleanup = () => {
    if (globalThis.__zeusWatcher) {
      void globalThis.__zeusWatcher.close();
      globalThis.__zeusWatcher = undefined;
    }
  };

  process.once("exit", cleanup);
  process.once("SIGINT", cleanup);
  process.once("SIGTERM", cleanup);

  globalThis.__zeusCleanupRegistered = true;
};

const queueZeusGeneration = async (
  args: string[],
  mode: "initial" | "watch",
) => {
  const failOnError = mode === "initial";

  if (globalThis.__zeusGenerationBusy) {
    globalThis.__zeusGenerationQueued = true;
    if (failOnError && globalThis.__zeusGenerationInFlight) {
      await globalThis.__zeusGenerationInFlight;
    }
    return;
  }

  globalThis.__zeusGenerationBusy = true;
  globalThis.__zeusGenerationInFlight = runGraphQLZeus(args);

  try {
    await globalThis.__zeusGenerationInFlight;
    logInfo("Generated Zeus types");
  } catch (error) {
    if (failOnError) {
      throw error;
    }
    logError("Failed to regenerate Zeus types", error);
  } finally {
    globalThis.__zeusGenerationBusy = undefined;
    globalThis.__zeusGenerationInFlight = undefined;
    if (globalThis.__zeusGenerationQueued) {
      globalThis.__zeusGenerationQueued = undefined;
      void queueZeusGeneration(args, "watch");
    }
  }
};

const startWatcher = (pathToWatch: string, args: string[]) => {
  if (globalThis.__zeusWatcher) {
    return;
  }

  ensureCleanup();

  const watcher = chokidar.watch(pathToWatch, {
    ignoreInitial: true,
  });

  const trigger = () => {
    void queueZeusGeneration(args, "watch");
  };

  watcher.on("add", trigger);
  watcher.on("change", trigger);
  watcher.on("unlink", trigger);

  globalThis.__zeusWatcher = watcher;
  logInfo("Watching", pathToWatch, "for schema changes");
};

export default function withZeusPlugin({
  input,
  output,
  args = [],
}: ZeusPluginOptions) {
  return (nextConfig: NextConfig = {}): NextConfig => {
    if (process.env.NODE_ENV !== "production") {
      const absInput = path.resolve(process.cwd(), input);
      const absOutput = path.resolve(process.cwd(), output);
      const commandArgs = [absInput, absOutput, ...args];
      if (!globalThis.__zeusInitialized) {
        try {
          runGraphQLZeusSync(commandArgs);
          logInfo("Generated Zeus types");
        } catch (error) {
          logError("Failed to generate Zeus types", error);
          throw error;
        }
        startWatcher(absInput, commandArgs);
        ensureCleanup();
        globalThis.__zeusInitialized = true;
      }
      return nextConfig;
    } else {
      return nextConfig;
    }
  };
}
