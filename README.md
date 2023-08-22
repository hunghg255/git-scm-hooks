# git-scm-hooks

- Rewrite from [git-scm-hooks](https://github.com/toplenboren/git-scm-hooks) use ESModule


### What is a git hook?

A git hook is a command or script that is going to be run every time you perform a git action, like `git commit` or `git push`.

If the execution of a git hook fails, then the git action aborts.

For example, if you want to run `linter` on every commit to ensure code quality in your project, then you can create a `pre-commit` hook that would call `npx lint-staged`.

Check out [lint-staged](https://github.com/okonet/lint-staged#readme). It works really well with `git-scm-hooks`.

You can look up about git hooks on the [Pro Git book](https://git-scm.com/book/en/v2/Customizing-Git-Git-Hooks).

### When to use it

`git-scm-hooks` works well for small-sized projects when you need quickly set up hooks and forget about it.

However, this package requires you to manually apply the changes to git hooks. If you update them often, this is probably not the best choice.

Also, this package allows you to set only one command per git hook.

If you need multiple verbose commands per git hook, flexible configuration or automatic update of git hooks, please check out the other packages:

- [Lefthook](https://github.com/Arkweid/lefthook)
- [husky](https://github.com/typicode/husky)
- [pre-commit](https://github.com/pre-commit/pre-commit)

## Usage

### Add git-scm-hooks to the project

1. Install git-scm-hooks as a dev dependency:

   ```sh
   npm install git-scm-hooks@latest --save-dev
   ```

2. Add `git-hooks` to your `package.json`. Fill it with git hooks and the corresponding commands.

   For example:

   ```jsonc
   {
     "git-hooks": {
       "pre-commit": "npx lint-staged",
       "pre-push": "cd ../../ && npm run format",

       // All unused hooks will be removed automatically by default
       // but you can use the `preserveUnused` option like following to prevent this behavior

       // if you'd prefer preserve all unused hooks
       "preserveUnused": true,

       // if you'd prefer preserve specific unused hooks
       "preserveUnused": ["commit-msg"]
     }
   }
   ```

   This configuration is going to run all linters on every `commit` and formatter on `push`.

   > There are more ways to configure the package. Check out [Additional configuration options](#additional-configuration-options).

3. Run the CLI script to update the git hooks with the commands from the config:

   ```sh
   # [Optional] These 2 steps can be skipped for non-husky users
   git config core.hooksPath .git/hooks/
   rm -rf .git/hooks

   # Update ./git/hooks
   npx git-scm-hooks
   ```

Now all the git hooks are created.

### Update git hooks command

1. Change the configuration.

2. Run `npx git-scm-hooks` **from the root of your project**.

Note for **yarn2** users: Please run `yarn dlx git-scm-hooks` instead of the command above. More info on [dlx](https://yarnpkg.com/cli/dlx)

Note that you should manually run `npx git-scm-hooks` **every time you change a command**.


```json
{
  "pre-commit": "npx lint-staged",
  "pre-push": "cd ../../ && npm run format"
}
```

If you need to have multiple configuration files or just your-own configuration file, you install hooks manually from it by `npx git-scm-hooks ./my-config.js`.

### Uninstall git-scm-hooks

> Uninstallation will remove all the existing git hooks.

```sh
npm uninstall git-scm-hooks
```

## Common issues

### I want to skip git hooks!

You should use `--no-verify` option

https://bobbyhadz.com/blog/git-commit-skip-hooks#skip-git-commit-hooks

### When migrating from `husky` git hooks are not running

**Why is this happening?**

Husky might change the `core.gitHooks` value to `.husky`, this way, git hooks would search `.husky` directory instead of `.git/hooks/`.

Read more on git configuration in [Git book](https://git-scm.com/docs/githooks)

You can check it by running this command inside of your repo:

`git config core.hooksPath`

If it outputs `.husky` then this is your case

**How to fix?**

you need to point `core.gitHooks` value to `your-awesome-project/.git/hooks`. You can use this command:

`git config core.hooksPath .git/hooks/`

validate the value is set:

`git config core.hooksPath`

should output: `.git/hooks/`

Then remove the `.husky` folder that are generated previously by `husky`.
