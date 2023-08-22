#!/usr/bin/env node

import { removeHooks } from ".";
import color from 'picocolors';

/**
 * Removes the pre-commit from command in config by default
 */
function uninstall() {
    console.log(color.green("[INFO] Removing git hooks from .git/hooks"));

    try {
        removeHooks();
        console.log(color.green("[INFO] Successfully removed all git hooks"));
    } catch (e) {
        console.log(color.red(`[INFO] Couldn't remove git hooks. Reason: ${e}`));
    }
}

uninstall();
