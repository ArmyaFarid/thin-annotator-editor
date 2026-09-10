import path from "path";
import {defineConfig} from "vitest/config";

// Deliberately not vite.config.ts: the Relay and StyleX plugins are irrelevant
// to these tests and slow them down. Only the `@` alias is shared.
export default defineConfig({
    resolve: {
        alias: {"@": path.resolve(__dirname, "./src")},
    },
    test: {
        include: ["src/**/__tests__/**/*.test.ts"],
        environment: "node",
    },
});
