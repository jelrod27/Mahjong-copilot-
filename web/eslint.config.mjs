import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  // `next lint` supplied these implicitly; running ESLint directly does not.
  {
    ignores: [
      ".next/**",
      "out/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
      "next-env.d.ts",
    ],
  },
  ...nextCoreWebVitals,
];

export default eslintConfig;
