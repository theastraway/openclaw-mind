/**
 * CLI subcommands for openclaw-mind.
 *
 * Uses OpenClaw's Commander-based registration pattern.
 *   openclaw mind init [--api-key KEY]
 *   openclaw mind status
 *   openclaw mind import [--workspace PATH]
 *   openclaw mind search "query"
 *
 * The registrar callback receives an `OpenClawPluginCliContext` with a
 * Commander `Command` instance. We use `any` for the parameter and action
 * callbacks because Commander's TypeScript types use overloads our local
 * structural stubs can't match — but the runtime contract is stable.
 */

import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import type { MindClient } from "../mind-client.js";
import type { MindPluginConfig } from "../config.js";
import { initCommand } from "./init.js";
import { statusCommand } from "./status.js";
import { importCommand } from "./import.js";
import { searchCommand } from "./search.js";

export function registerCliCommands(
  api: OpenClawPluginApi,
  client: MindClient | null,
  config: MindPluginConfig,
): void {
  api.registerCli(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ctx: any) => {
      const program = ctx.program;
      const mind = program
        .command("mind")
        .description("MIND personal knowledge graph commands");

      mind
        .command("init")
        .description("Set up your MIND API key and verify the connection")
        .option("--api-key <key>", "MIND API key (mind_...)")
        .option("--email <email>", "Email for magic-link auth (alternative to api-key)")
        .option("--base-url <url>", "Override the MIND base URL (for self-hosting)")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .action(async (opts: any) => {
          await initCommand(
            api,
            { apiKey: opts.apiKey, email: opts.email, baseUrl: opts.baseUrl },
            config,
          );
        });

      mind
        .command("status")
        .description("Verify the MIND connection and show your account info")
        .action(async () => {
          await statusCommand(api, client, config);
        });

      mind
        .command("import")
        .description("Import OpenClaw workspace memory files into MIND")
        .option(
          "--workspace <path>",
          "Path to OpenClaw workspace dir (default: ~/.openclaw/workspace)",
        )
        .option("--days <n>", "How many days of recent memory files to import (default: 30)")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .action(async (opts: any) => {
          await importCommand(api, client, config, {
            workspace: opts.workspace,
            days: opts.days,
          });
        });

      mind
        .command("search")
        .description("Quick CLI search of the MIND knowledge graph")
        .argument("<query>", "What to search for")
        .option("--mode <mode>", "Query mode (hybrid/mix/global/local/naive)")
        .option("--top-k <n>", "Max results (default: 5)")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .action(async (query: string, opts: any) => {
          await searchCommand(api, client, {
            query,
            mode: opts.mode,
            topK: opts.topK,
          });
        });
    },
    { commands: ["mind"] },
  );
}
