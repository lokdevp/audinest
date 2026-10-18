const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// See src/shims/file-type.ts.
const fileTypeShim = path.resolve(__dirname, 'src/shims/file-type.ts');
const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'file-type') {
    return { type: 'sourceFile', filePath: fileTypeShim };
  }
  return (defaultResolveRequest ?? context.resolveRequest)(context, moduleName, platform);
};

module.exports = config;
