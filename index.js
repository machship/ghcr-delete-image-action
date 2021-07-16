const core = require("@actions/core");
const github = require("@actions/github");
const utils = require("./utils");
const actions = require("./actions");

async function run() {
  try {
    const config = utils.getConfig();
    const octokit = github.getOctokit(config.token, {
      log: {
        debug: () => console.info,
        info: () => console.info,
        warn: console.warn,
        error: console.error
      },
    });

    if (config.tag) {
      await actions.deleteByTag(config, octokit);
    } else if (config.untaggedKeepLatest) {
      await actions.deleteUntaggedOrderGreaterThan(config, octokit);
    } else if (config.taggedKeepLatest && config.tagRegex) {
      await actions.deleteTagRegexMatchOrderGreaterThan(config, octokit);
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
