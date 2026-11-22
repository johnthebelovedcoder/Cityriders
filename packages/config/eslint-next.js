/** @type {import("eslint").Linter.Config} */
module.exports = {
  extends: [
    require.resolve('./eslint-base.js'),
    'next/core-web-vitals',
  ],
  rules: {
    'react/no-unknown-property': 'off',
    '@next/next/no-html-link-for-pages': 'off',
  },
};
