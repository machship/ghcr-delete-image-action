const core = require("@actions/core");

/**
 * Parse input from env.
 * @returns Config
 */
let getConfig = function () {
  const config = {
    owner: core.getInput("owner", { required: true }),
    name: core.getInput("name", { required: true }),
    token: core.getInput("token", { required: true }),

    // optional, mutual exclusive options
    tag: core.getInput("tag") || null,
    untaggedKeepLatest: core.getInput("untagged-keep-latest") || null,
    untaggedOlderThan: core.getInput("untagged-older-than") || null,
    taggedKeepLatest: core.getInput("tagged-keep-latest") || null,
    tagRegex: core.getInput("tag-regex") || null
  };

  const definedOptionsCount = [
    config.tag,
    config.untaggedKeepLatest,
    config.untaggedOlderThan,
    config.taggedKeepLatest,
    config.tagRegex
  ].filter((x) => x !== null).length;

  if (definedOptionsCount == 0) {
    throw new Error("no any required options defined");
  }
  // else if (definedOptionsCount > 1) {
  //   throw new Error("too many selectors defined, use only one");
  // }

  if (config.untaggedKeepLatest) {
    if (
      isNaN((config.untaggedKeepLatest = parseInt(config.untaggedKeepLatest)))
    ) {
      throw new Error("untagged-keep-latest is not number");
    }
  }

  if (config.taggedKeepLatest) {
    if (
      isNaN((config.taggedKeepLatest = parseInt(config.taggedKeepLatest)))
    ) {
      throw new Error("tagged-keep-latest is not number");
    }
    if (!config.tagRegex)
      throw new Error("regex must be provided when tagged-keep-latest set");
  }

  if (config.untaggedOlderThan) {
    if (
      isNaN((config.untaggedOlderThan = parseInt(config.untaggedOlderThan)))
    ) {
      throw new Error("untagged-older-than is not number");
    }
  }

  return config;
};

let findPackageVersionByTag = async function (octokit, owner, name, tag) {
  const tags = new Set();

  for await (const pkgVer of iteratePackageVersions(octokit, owner, name)) {
    const versionTags = pkgVer.metadata.container.tags;

    if (versionTags.includes(tag)) {
      return pkgVer;
    } else {
      versionTags.map((item) => {
        tags.add(item);
      });
    }
  }

  throw new Error(
    `package with tag '${tag}' does not exits, available tags: ${Array.from(
      tags
    ).join(", ")}`
  );
};

let findPackageVersionsUntaggedOrderGreaterThan = async function (
  octokit,
  owner,
  name,
  n
) {
  const pkgs = [];

  for await (const pkgVer of iteratePackageVersions(octokit, owner, name)) {
    const versionTags = pkgVer.metadata.container.tags;
    if (versionTags.length == 0) {
      pkgs.push(pkgVer);
    }
  }

  pkgs.sort((a, b) => {
    return new Date(b.updated_at) - new Date(a.updated_at);
  });

  return pkgs.slice(n);
};

let findPackageVersionsTagRegexMatchOrderGreaterThan = async function (
  octokit,
  owner,
  name,
  taggedKeepLatest,
  untaggedKeepLatest,
  regex
) {
  const pkgs = [];
  const untaggedPkgs = [];
  // const pkgVers = await iteratePackageVersions(octokit, owner, name);
  for await (const pkgVer of iteratePackageVersions(octokit, owner, name)) {
    core.info(`🔎 found pkgVer ${pkgVer.metadata.container.tags}...`);
    const versionTags = pkgVer.metadata.container.tags;
    if (regex && versionTags.length > 0) {
      for (let tag of versionTags) {
        core.info(`🔎 found tag ${tag}...`);

        if (!regex.test(tag)) {
          core.info(`🔎 tag ${tag} does not match. Ignoring`);
        
          continue;
        }
        core.info(`🔎 tag ${tag} matches. Deleting...`);
        pkgs.push(pkgVer);
        break;
      }
    } else if (versionTags.length === 0 && untaggedKeepLatest >= 0) {
      untaggedPkgs.push(pkgVer);
    }
  }

  pkgs.sort((a, b) => {
    return new Date(b.updated_at) - new Date(a.updated_at);
  });

  untaggedPkgs.sort((a, b) => {
    return new Date(b.updated_at) - new Date(a.updated_at);
  });
  const pkgsToDelete = [];
  if (pkgs.length > 0) {
    core.info(`🔎  ${pkgs.length} tagged packages to delete...`);
    pkgs.slice(taggedKeepLatest);
    pkgsToDelete.push.apply(pkgs);
  }
  if (untaggedPkgs.length > 0) {
    core.info(`🔎  ${untaggedPkgs.length} untagged packages to delete...`);
    untaggedPkgs.slice(untaggedKeepLatest);
    pkgsToDelete.push.apply(untaggedPkgs);
  }
  core.info(`🔎  ${pkgsToDelete.length} total packages to delete...`);
  return pkgsToDelete;
};

let iteratePackageVersions = async function* (octokit, owner, name) {
  for await (const response of octokit.paginate.iterator(
    octokit.rest.packages.getAllPackageVersionsForPackageOwnedByOrg,
    {
      package_type: "container",
      package_name: name,
      org: owner,
      state: "active",
      per_page: 100,
    }
  )) {
    for (let packageVersion of response.data) {
      yield packageVersion;
    }
  }
};

let deletePackageVersion = async (octokit, owner, name, versionId) => {
  await octokit.rest.packages.deletePackageVersionForOrg({
    package_type: "container",
    package_name: name,
    org: owner,
    package_version_id: versionId,
  });
};

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

module.exports = {
  getConfig,
  findPackageVersionByTag,
  deletePackageVersion,
  findPackageVersionsUntaggedOrderGreaterThan,
  findPackageVersionsTagRegexMatchOrderGreaterThan,
  sleep,
};
