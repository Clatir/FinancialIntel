// adapted from ICTTJ electron-builder.cjs @ 84a8339
/**
 * electron-builder configuration: the NSIS installer and the portable exe, with stable file names – the GitHub
 * release always has the same two files (the app updates itself from them, see src/shared/update.ts).
 */
const product = 'Financial Intel'
const file = 'Financial-Intel'
const icon = 'resources/icon.png'

module.exports = {
  appId: 'app.financialintel.desktop',
  productName: product,
  executableName: product,
  // app.getName() (settings folder, uninstaller name) comes from the packaged package.json.
  extraMetadata: { productName: product },
  copyright: 'Copyright © 2026 Financial Intel',
  directories: { output: 'release', buildResources: 'resources' },
  // Everything is bundled by electron-vite into out/ (all libraries are devDependencies),
  // so the package contains no node_modules and no native modules.
  files: ['out/**', 'package.json', '!**/*.map'],
  asar: true,
  npmRebuild: false,
  nodeGypRebuild: false,
  buildDependenciesFromSource: false,
  electronLanguages: ['pl', 'en-US'],
  win: {
    icon,
    target: [
      { target: 'portable', arch: ['x64'] },
      { target: 'nsis', arch: ['x64'] }
    ]
  },
  portable: { artifactName: `${file}-portable.\${ext}` },
  nsis: {
    artifactName: `${file}-Setup.\${ext}`,
    oneClick: false,
    perMachine: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: product,
    deleteAppDataOnUninstall: false
  },
  linux: { target: ['dir'], icon }
}
