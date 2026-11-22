module.exports = {
  ...require('@cityrider/config/eslint-nest.js'),
  parserOptions: {
    project: 'tsconfig.json',
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
};
