const utils = require("./utils");
const core = require("@actions/core");

async function deleteByTag(config, octokit) {
  core.info(`🔎 search package version with tag ${config.tag}...`);

  const packageVersion = await utils.findPackageVersionByTag(
    octokit,
    config.owner,
    config.name,
    config.tag
  );

  core.info(`🆔 package id is #${packageVersion.id}, delete it...`);

  await utils.deletePackageVersion(
    octokit,
    config.owner,
    config.name,
    packageVersion.id
  );

  core.info(`✅ package #${packageVersion.id} deleted.`);
}

async function deleteUntaggedOrderGreaterThan(config, octokit) {
  core.info(`🔎 find not latest ${config.untaggedKeepLatest} packages...`);

  const pkgs = await utils.findPackageVersionsUntaggedOrderGreaterThan(
    octokit,
    config.owner,
    config.name,
    config.untaggedKeepLatest
  );

  core.startGroup(`🗑 delete ${pkgs.length} packages`);

  for (const pkg of pkgs) {
    await utils.deletePackageVersion(
      octokit,
      config.owner,
      config.name,
      pkg.id
    );

    core.info(`✅ package #${pkg.id} deleted.`);
  }

  core.endGroup();
}

async function deleteTagRegexMatchOrderGreaterThan(config, octokit) {
  core.info(`🔎 finding latest tagged ${config.taggedKeepLatest} packages matching regex ${config.tagRegex}. Also finding latest untagged ${config.untaggedKeepLatest} packages...`);

  const pkgs = await utils.findPackageVersionsTagRegexMatchOrderGreaterThan(
    octokit,
    config.owner,
    config.name,
    config.taggedKeepLatest,
    config.untaggedKeepLatest,
    new RegExp(config.tagRegex)
  );

  core.startGroup(`🗑 delete ${pkgs.length} packages`);

  for (const pkg of pkgs) {
    await utils.deletePackageVersion(
      octokit,
      config.owner,
      config.name,
      pkg.id
    );

    core.info(`✅ package #${pkg.id} deleted.`);
  }

  core.endGroup();
}

module.exports = { deleteByTag, deleteUntaggedOrderGreaterThan, deleteTagRegexMatchOrderGreaterThan };
