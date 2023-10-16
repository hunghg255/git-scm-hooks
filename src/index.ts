import fs from 'node:fs';
import path from 'node:path';
import color from 'picocolors';
import { readConfig } from 'unreadconfig';

const VALID_GIT_HOOKS = [
  'applypatch-msg',
  'pre-applypatch',
  'post-applypatch',
  'pre-commit',
  'pre-merge-commit',
  'prepare-commit-msg',
  'commit-msg',
  'post-commit',
  'pre-rebase',
  'post-checkout',
  'post-merge',
  'pre-push',
  'pre-receive',
  'update',
  'proc-receive',
  'post-receive',
  'post-update',
  'reference-transaction',
  'push-to-checkout',
  'pre-auto-gc',
  'post-rewrite',
  'sendemail-validate',
  'fsmonitor-watchman',
  'p4-changelist',
  'p4-prepare-changelist',
  'p4-post-changelist',
  'p4-pre-submit',
  'post-index-change',
] as const;

const VALID_OPTIONS = ['preserveUnused'];

type TGitHook = typeof VALID_GIT_HOOKS[number];

export const defineConfig = (config: Partial<Record<TGitHook, any>>) => {
  return config;
}

/**
 * Recursively gets the .git folder path from provided directory
 * @param {string} directory
 * @return {string | undefined} .git folder path or undefined if it was not found
 */
function getGitProjectRoot(directory = process.cwd()): any {
  let start: any = directory;
  if (typeof start === 'string') {
    if (start[start.length - 1] !== path.sep) {
      start += path.sep;
    }
    start = path.normalize(start);
    start = start.split(path.sep);
  }
  if (!start.length) {
    return undefined;
  }
  start.pop();

  let dir = start.join(path.sep);
  let fullPath = path.join(dir, '.git');

  if (fs.existsSync(fullPath)) {
    if (!fs.lstatSync(fullPath).isDirectory()) {
      let content = fs.readFileSync(fullPath, { encoding: 'utf-8' });
      let match = /^gitdir: (.*)\s*$/.exec(content);
      if (match) {
        let gitDir = match[1];
        let commonDir = path.join(gitDir, 'commondir');
        if (fs.existsSync(commonDir)) {
          commonDir = fs.readFileSync(commonDir, 'utf8').trim();
          return path.resolve(gitDir, commonDir);
        }
        return path.normalize(gitDir);
      }
    }
    return path.normalize(fullPath);
  } else {
    return getGitProjectRoot(start);
  }
}

/**
 * Transforms the <project>/node_modules/git-hooks to <project>
 * @param projectPath - path to the git-hooks in node modules
 * @return {string | undefined} - an absolute path to the project or undefined if projectPath is not in node_modules
 */
function getProjectRootDirectoryFromNodeModules(projectPath: any) {
  function _arraysAreEqual(a1: any, a2: any) {
    return JSON.stringify(a1) === JSON.stringify(a2);
  }

  const projDir = projectPath.split(/[\\/]/); // <- would split both on '/' and '\'

  const indexOfPnpmDir = projDir.indexOf('.pnpm');
  if (indexOfPnpmDir > -1) {
    return projDir.slice(0, indexOfPnpmDir - 1).join('/');
  }

  const indexOfStoreDir = projDir.indexOf('.store');
  if (indexOfStoreDir > -1) {
    return projDir.slice(0, indexOfStoreDir - 1).join('/');
  }

  // A yarn2 STAB
  if (projDir.includes('.yarn') && projDir.includes('unplugged')) {
    return undefined;
  }

  if (
    projDir.length > 2 &&
    _arraysAreEqual(projDir.slice(projDir.length - 2, projDir.length), [
      'node_modules',
      'git-hooks',
    ])
  ) {
    return projDir.slice(0, projDir.length - 2).join('/');
  }

  return undefined;
}

/**
 * Checks the 'git-hooks' in dependencies of the project
 * @param {string} projectRootPath
 * @throws TypeError if packageJsonData not an object
 * @return {Boolean}
 */
function checkSimpleGitHooksInDependencies(projectRootPath: any) {
  if (typeof projectRootPath !== 'string') {
    throw TypeError('Package json path is not a string!');
  }

  const { packageJsonContent } = _getPackageJson(projectRootPath);

  // if git-hooks in dependencies -> note user that he should remove move it to devDeps!
  if (
    'dependencies' in packageJsonContent &&
    'git-hooks' in packageJsonContent.dependencies
  ) {
    console.log(
      color.yellow('[WARN] You should move git-hooks to the devDependencies!')
    );
    return true; // We only check that we are in the correct package, e.g not in a dependency of a dependency
  }
  if (!('devDependencies' in packageJsonContent)) {
    return false;
  }
  return 'git-hooks' in packageJsonContent.devDependencies;
}

/**
 * Parses the config and sets git hooks
 * @param {string} projectRootPath
 * @param {string[]} [argv]
 */
function setHooksFromConfig(
  projectRootPath = process.cwd(),
  argv = process.argv
) {
  const customConfigPath = _getCustomConfigPath(argv as any);
  const config = _getConfig(projectRootPath, customConfigPath);

  if (!config) {
    throw '[ERROR] Config was not found! Please add `git-hooks.config.ts` or `git-hooks.config.js` entry in package.json.\r\nCheck README for details';
  }

  const preserveUnused = Array.isArray(config.preserveUnused)
    ? config.preserveUnused
    : config.preserveUnused
    ? VALID_GIT_HOOKS
    : [];

  for (let hook of VALID_GIT_HOOKS) {
    if (Object.prototype.hasOwnProperty.call(config, hook)) {
      _setHook(hook, config[hook], projectRootPath);
    } else if (!preserveUnused.includes(hook)) {
      _removeHook(hook, projectRootPath);
    }
  }
}

/**
 * Creates or replaces an existing executable script in .git/hooks/<hook> with provided command
 * @param {string} hook
 * @param {string} command
 * @param {string} projectRoot
 * @private
 */
function _setHook(hook: any, command: any, projectRoot = process.cwd()) {
  const gitRoot = getGitProjectRoot(projectRoot);

  if (!gitRoot) {
    console.log(color.green('[INFO] No `.git` root folder found, skipping'));
    return;
  }

  const hookCommand = '#!/bin/sh\n' + command;
  const hookDirectory = gitRoot + '/hooks/';
  const hookPath = path.normalize(hookDirectory + hook);

  const normalizedHookDirectory = path.normalize(hookDirectory);
  if (!fs.existsSync(normalizedHookDirectory)) {
    fs.mkdirSync(normalizedHookDirectory);
  }

  fs.writeFileSync(hookPath, hookCommand);
  fs.chmodSync(hookPath, 0o0755);

  console.log(color.green(`[INFO] Successfully set the ${hook} with command: ${command}`));
}

/**
 * Deletes all git hooks
 * @param {string} projectRoot
 */
function removeHooks(projectRoot = process.cwd()) {
  for (let configEntry of VALID_GIT_HOOKS) {
    _removeHook(configEntry, projectRoot);
  }
}

/**
 * Removes the pre-commit hook from .git/hooks
 * @param {string} hook
 * @param {string} projectRoot
 * @private
 */
function _removeHook(hook: any, projectRoot = process.cwd()) {
  const gitRoot = getGitProjectRoot(projectRoot);
  const hookPath = path.normalize(gitRoot + '/hooks/' + hook);

  if (fs.existsSync(hookPath)) {
    fs.unlinkSync(hookPath);
  }
}

/** Reads package.json file, returns package.json content and path
 * @param {string} projectPath - a path to the project, defaults to process.cwd
 * @return {{packageJsonContent: any, packageJsonPath: string}}
 * @throws TypeError if projectPath is not a string
 * @throws Error if cant read package.json
 * @private
 */
function _getPackageJson(projectPath = process.cwd()) {
  if (typeof projectPath !== 'string') {
    throw TypeError('projectPath is not a string');
  }

  const targetPackageJson = path.normalize(projectPath + '/package.json');

  if (!fs.statSync(targetPackageJson).isFile()) {
    throw Error("Package.json doesn't exist");
  }

  const packageJsonDataRaw = fs.readFileSync(targetPackageJson);
  return {
    packageJsonContent: JSON.parse(packageJsonDataRaw as any),
    packageJsonPath: targetPackageJson,
  };
}

/**
 * Takes the first argument from current process argv and returns it
 * Returns empty string when argument wasn't passed
 * @param {string[]} [argv]
 * @returns {string}
 */
function _getCustomConfigPath(argv = []) {
  // We'll run as one of the following:
  // npx git-hooks config
  // node path/to/git-hooks/cli.js config
  return argv[2] || '';
}

/**
 * Gets user-set command either from sources
 * First try to get command from .simple-pre-commit.json
 * If not found -> try to get command from package.json
 * @param {string} projectRootPath
 * @param {string} [configFileName]
 * @throws TypeError if projectRootPath is not string
 * @return {{string: string} | undefined}
 * @private
 */
const DEFAULT_FILE_NAME = 'git-hooks';

function _getConfig(projectRootPath: any, configFileName = '') {
  if (typeof projectRootPath !== 'string') {
    throw TypeError(
      'Check project root path! Expected a string, but got ' +
        typeof projectRootPath
    );
  }

  // every function here should accept projectRootPath as first argument and return object
  const sources = [
    () => readConfig(DEFAULT_FILE_NAME),
    () => _getConfigFromPackageJson(projectRootPath),
  ];

  // if user pass his-own config path prepend custom path before the default ones
  if (configFileName) {
    sources.unshift(() => readConfig(configFileName));
  }

  for (let executeSource of sources) {
    let config = executeSource();
    if (config && _validateHooks(config)) {
      return config;
    } else if (config && !_validateHooks(config)) {
      throw '[ERROR] Config was not in correct format. Please check git hooks or options name';
    }
  }

  return undefined;
}

/**
 * Gets current config from package.json[simple-pre-commit]
 * @param {string} projectRootPath
 * @throws TypeError if packageJsonPath is not a string
 * @throws Error if package.json couldn't be read or was not validated
 * @return {{string: string} | undefined}
 */
function _getConfigFromPackageJson(projectRootPath = process.cwd()) {
  const { packageJsonContent } = _getPackageJson(projectRootPath);
  const config = packageJsonContent['git-hooks'];
  return typeof config === 'string'
    ? _getConfig(config)
    : packageJsonContent['git-hooks'];
}

/**
 * Validates the config, checks that every git hook or option is named correctly
 * @return {boolean}
 * @param {{string: string}} config
 */
function _validateHooks(config: any) {
  for (let hookOrOption in config) {
    if (
      !VALID_GIT_HOOKS.includes(hookOrOption as any) &&
      !VALID_OPTIONS.includes(hookOrOption)
    ) {
      return false;
    }
  }

  return true;
}

export {
  checkSimpleGitHooksInDependencies,
  setHooksFromConfig,
  getProjectRootDirectoryFromNodeModules,
  getGitProjectRoot,
  removeHooks,
};
