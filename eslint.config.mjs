import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Allow any for flexibility in prototype code
      '@typescript-eslint/no-explicit-any': 'off',
      // Allow setState in useEffect for hydration
      'react-hooks/set-state-in-effect': 'off',
      // Relax some rules for faster development
      '@typescript-eslint/no-unused-vars': 'warn',
      '@next/next/no-img-element': 'off',
      'react/no-unescaped-entities': 'off',
      'prefer-const': 'warn',
    }
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
