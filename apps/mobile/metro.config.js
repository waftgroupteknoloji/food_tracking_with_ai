const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// pnpm monorepo için: workspace root'taki shared packages'i izle ve
// her iki node_modules klasörünü resolution path'ine ekle.
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
// Default hierarchical lookup açık kalsın — pnpm symlink'leri parent dir'lerden çözebilsin.

module.exports = withNativeWind(config, { input: './global.css' });
