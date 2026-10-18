import path from "node:path";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  // Agent worktrees live under .claude/ and carry their own copies of the tests.
  test: { exclude: [...configDefaults.exclude, ".claude/**", "design/**"] },
});
