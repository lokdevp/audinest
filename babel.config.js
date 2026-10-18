module.exports = function babelConfig(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // file-type (used by music-metadata) has /…/v regexes, which Hermes can't compile.
    plugins: ['@babel/plugin-transform-unicode-sets-regex'],
    env: {
      // music-metadata lazy-loads its parsers with import(), which Jest can't run natively.
      test: {
        plugins: ['@babel/plugin-transform-dynamic-import'],
      },
      production: {
        plugins: ['transform-remove-console'],
      },
    },
  };
};
