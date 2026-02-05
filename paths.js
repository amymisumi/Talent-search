const path = require('path');

// This file helps the TypeScript server resolve module paths correctly
// It's a workaround for path alias resolution in VS Code

const tsConfig = require('./tsconfig.json');
const tsConfigPaths = require('tsconfig-paths');

const baseUrl = path.resolve(__dirname);
const cleanup = tsConfigPaths.register({
  baseUrl,
  paths: tsConfig.compilerOptions.paths
});

// Cleanup when the process exits
process.on('exit', () => cleanup());
