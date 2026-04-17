const core = require("@actions/core");
const github = require("@actions/github");
const utils = require("./utils");
const actions = require("./actions");

async function run() {
  try {
    const config = utils.getConfig();
    core.setSecret(config.token);
    const octokit = github.getOctokit(config.token, {
      log: {
        debug: core.debug,
        info: core.info,
        warn: core.warning,
        error: core.error
      },
    });

    await actions.deleteTagRegexMatchOrderGreaterThan(config, octokit);

  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
