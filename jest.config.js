const { transformIgnorePatterns } = require('jest-expo/jest-preset');

// music-metadata and its tokenizer dependencies ship as ES modules and need transforming too.
const esmPackages = [
  'music-metadata',
  'strtok3',
  'token-types',
  '@tokenizer',
  '@borewit',
  'uint8array-extras',
  'win-guid',
  'content-type',
  'media-typer',
];

module.exports = {
  preset: 'jest-expo',
  // music-metadata only exposes an `import` condition, which Jest's require resolver skips.
  moduleNameMapper: {
    '^music-metadata$': '<rootDir>/node_modules/music-metadata/lib/core.js',
    // Same alias as metro.config.js, see src/shims/file-type.ts.
    '^file-type$': '<rootDir>/src/shims/file-type.ts',
  },
  transformIgnorePatterns: transformIgnorePatterns.map((pattern) =>
    pattern.startsWith('/node_modules/(?!(')
      ? pattern.replace('/node_modules/(?!(', `/node_modules/(?!(${esmPackages.join('|')}|`)
      : pattern),
};
