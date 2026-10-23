import js from "@eslint/js";
import {defineConfig} from "eslint/config";
import importPlugin from "eslint-plugin-import";
import prettierRecommended from "eslint-plugin-prettier/recommended";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig(
    {
        // Matches the old `--ext ts,tsx`: plain JS was never linted.
        ignores: [
            "**/*.{js,mjs,cjs}",
            "dist",
            "env.d.ts",
            "vite.config.ts",
        ],
    },
    js.configs.recommended,
    tseslint.configs.recommended,
    react.configs.flat.recommended,
    importPlugin.flatConfigs.recommended,
    importPlugin.flatConfigs.typescript,
    prettierRecommended,
    {
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
            globals: globals.browser,
            parserOptions: {
                project: ["./tsconfig.json", "./tsconfig.node.json"],
                tsconfigRootDir: import.meta.dirname,
            },
        },
        // Only the two classic rules: v7's `recommended` also turns on the
        // React Compiler rules, which this codebase was never written for.
        plugins: {
            "react-hooks": reactHooks,
            "react-refresh": reactRefresh,
        },
        settings: {
            react: {version: "detect"},
            "import/resolver": {
                typescript: {},
                node: {},
            },
        },
        rules: {
            "react-hooks/rules-of-hooks": "error",
            "react-hooks/exhaustive-deps": "warn",
            "prettier/prettier": "warn",
            "no-console": "warn",
            curly: "warn",
            "react/jsx-no-useless-fragment": "warn",
            "@typescript-eslint/no-unused-vars": [
                "warn",
                {argsIgnorePattern: "^_"},
            ],
            "react-refresh/only-export-components": [
                "warn",
                {allowConstantExport: true},
            ],
            "react/react-in-jsx-scope": "off",
        },
    },
);
