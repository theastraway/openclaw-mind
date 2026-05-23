/**
 * mind_bootstrap_templates — Seed all 16 Front Layer templates into a tenant.
 */

import { Type } from "@sinclair/typebox";
import type { ToolDeps } from "./index.js";

const BootstrapParameters = Type.Object({});

export function createMindBootstrapTemplatesTool(deps: ToolDeps) {
  return {
    name: "mind_bootstrap_templates",
    label: "MIND Bootstrap Templates",
    description:
      "Seed all 16 MIND Front Layer templates into this MIND tenant as system documents. After running, the templates become queryable through mind_query so agents can ask 'what should I fill out for SOUL?' and retrieve the spec from their own KG. Idempotent — re-runs create fresh copies. Run once per new tenant.",
    parameters: BootstrapParameters,
    async execute() {
      try {
        const r = await deps.client.bootstrapFrontLayerTemplates();
        return {
          content: [
            {
              type: "text" as const,
              text: `Bootstrapped ${r.bootstrapped}/${r.total} template(s) into this MIND tenant.`,
            },
          ],
          details: r,
        };
      } catch (err) {
        const msg = (err as Error).message;
        return {
          content: [{ type: "text" as const, text: `mind_bootstrap_templates failed: ${msg}` }],
          details: { error: msg },
        };
      }
    },
  };
}
