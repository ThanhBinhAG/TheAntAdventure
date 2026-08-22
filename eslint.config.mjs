import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,

  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    // Playwright trace viewer bundles are generated test artefacts, not CRM source.
    "playwright-report/**",
    "test-results/**",
    "next-env.d.ts",
    "supabase/.temp/**",
    // Local scratch / notes (gitignored); do not lint as app code.
    "Personal/**",
  ]),

  // Forked Sharp workers are plain CommonJS (no bundler, no @/ aliases), so require() is
  // the only way for them to load modules.
  {
    files: ["**/*.cjs"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
  {
    files: ["tests/**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
]);
