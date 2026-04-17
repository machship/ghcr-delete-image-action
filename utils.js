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

    untaggedKeepLatest: core.getInput("untagged-keep-latest") || null,
    taggedKeepLatest: core.getInput("tagged-keep-latest") || null,
    tagRegex: core.getInput("tag-regex") || null
  };

  const definedOptionsCount = [
    
    config.untaggedKeepLatest,
    config.taggedKeepLatest,
    config.tagRegex
  ].filter((x) => x !== null).length;

  if (definedOptionsCount == 0) {
    throw new Error("no any required options defined");
  }
  if (config.untaggedKeepLatest) {
    config.untaggedKeepLatest = parseInt(config.untaggedKeepLatest);
    if (isNaN(config.untaggedKeepLatest)) {
      throw new Error("untagged-keep-latest is not a number");
    }
    if (config.untaggedKeepLatest < 1) {
      throw new Error("untagged-keep-latest must be a positive integer");
    }
  }

  if (config.taggedKeepLatest) {
    config.taggedKeepLatest = parseInt(config.taggedKeepLatest);
    if (isNaN(config.taggedKeepLatest)) {
      throw new Error("tagged-keep-latest is not a number");
    }
    if (config.taggedKeepLatest < 1) {
      throw new Error("tagged-keep-latest must be a positive integer");
    }
    if (!config.tagRegex)
      throw new Error("regex must be provided when tagged-keep-latest set");
  }

  return config;
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
        if (!regex.test(tag)) {
          continue;
        }
        core.info(`🔎 tag ${tag} matches. VersionId: ${pkgVer.id}. Deleting...`);
        pkgs.push(pkgVer);
        break;
      }
    } else if (versionTags.length === 0 && untaggedKeepLatest != null) {
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
    core.info(`🔎  ${pkgs.length} tagged packages to delete. Keeping top ${taggedKeepLatest}...`);
    for (let pkg of pkgs.slice(taggedKeepLatest))
      pkgsToDelete.push(pkg);
  }
  if (untaggedPkgs.length > 0) {
    core.info(`🔎  ${untaggedPkgs.length} untagged packages to delete. Keeping top ${untaggedKeepLatest}...`);
    for (let pkg of untaggedPkgs.slice(untaggedKeepLatest))
      pkgsToDelete.push(pkg);
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
  core.info(`deleting package ${owner}/${name}:${versionId}`);
  await octokit.rest.packages.deletePackageVersionForOrg({
    package_type: "container",
    package_name: name,
    org: owner,
    package_version_id: versionId,
  });
};

const MAX_REGEX_LENGTH = 256;

function safeRegex(pattern) {
  if (pattern.length > MAX_REGEX_LENGTH) {
    throw new Error(`tag-regex exceeds maximum length of ${MAX_REGEX_LENGTH} characters`);
  }
  try {
    return new RegExp(pattern);
  } catch (e) {
    throw new Error(`invalid tag-regex '${pattern}': ${e.message}`);
  }
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

module.exports = {
  getConfig,
  deletePackageVersion,
  findPackageVersionsTagRegexMatchOrderGreaterThan,
  safeRegex,
  sleep,
};
