import { dirname } from "path";
import { fileURLToPath } from "url";
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import nextPlugin from "@next/eslint-plugin-next";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import globals from "globals";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default tseslint.config(
  // ---------- global ignores ----------
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "coverage/**",
      "dist/**",
      "Beauty-Sleep-*/**",
      "supabase/**",
      "*.config.js",
      "*.config.ts",
      "jest.setup.*",
    ],
  },

  // ---------- base JS recommended ----------
  js.configs.recommended,

  // ---------- TypeScript (lenient) ----------
  ...tseslint.configs.recommended,

  // ---------- project-wide settings ----------
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
        React: "readonly",
        JSX: "readonly",
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      // --- TypeScript: keep it relaxed for a working project ---
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/ban-ts-comment": "off",

      // --- General ---
      "no-console": "off",
      "prefer-const": "warn",
      "no-unused-vars": "off", // handled by @typescript-eslint
      "no-useless-assignment": "off", // false positives with try/catch let pattern
    },
  },

  // ---------- Next.js plugin ----------
  {
    plugins: {
      "@next/next": nextPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
    },
  },

  // ---------- React Hooks ----------
  {
    plugins: {
      "react-hooks": reactHooksPlugin,
    },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
);
