import { defineConfig } from "eslint/config";

const eslintConfig = defineConfig([
  {
    ignores: [".next/**", "out/**", "build/**", "next-env.d.ts"],
  },
  {
    rules: {},
  },
]);

export default eslintConfig;
