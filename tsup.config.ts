import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  target: "node22",
  platform: "node",
  splitting: false,
  outDir: "dist",
  // OpenClaw plugin SDK is provided by the host — never bundle it
  external: ["openclaw", /^openclaw\//],
});
