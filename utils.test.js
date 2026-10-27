const { describe, test, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const utils = require("./utils");

const sharedRequiredOpts = {
  INPUT_OWNER: "machship",
  INPUT_NAME: "ghcr-delete-image-action",
  INPUT_TOKEN: "some-token",
};

let setKeys = [];

let withEnv = (envs) => {
  for (const k in envs) {
    process.env[k] = envs[k];
    setKeys.push(k);
  }
};

afterEach(() => {
  for (const k of setKeys) {
    delete process.env[k];
  }
  setKeys = [];
});

describe("getConfig", () => {
  test("throw error if value is missing", () => {
    assert.throws(() => utils.getConfig());
  });

  test("returns valid config", () => {
    withEnv({
      ...sharedRequiredOpts,
      "INPUT_TAGGED-KEEP-LATEST": "1",
      "INPUT_UNTAGGED-KEEP-LATEST": "2",
      "INPUT_TAG-REGEX": "testtag-.",
    });
    assert.deepStrictEqual(utils.getConfig(), {
      owner: "machship",
      name: "ghcr-delete-image-action",
      token: "some-token",
      untaggedKeepLatest: 2,
      taggedKeepLatest: 1,
      tagRegex: "testtag-.",
    });
  });

  test("throw error if no any required defined", () => {
    withEnv(sharedRequiredOpts);
    assert.throws(() => utils.getConfig(), {
      message: "no any required options defined",
    });
  });

  test("throw error if untagged keep latest is not number", () => {
    withEnv({ ...sharedRequiredOpts, "INPUT_UNTAGGED-KEEP-LATEST": "asdf" });
    assert.throws(() => utils.getConfig(), {
      message: "untagged-keep-latest is not a number",
    });
  });

  test("throw error if untagged keep latest is not positive", () => {
    withEnv({ ...sharedRequiredOpts, "INPUT_UNTAGGED-KEEP-LATEST": "-1" });
    assert.throws(() => utils.getConfig(), {
      message: "untagged-keep-latest must be a positive integer",
    });
  });

  test("throw error if tagged keep latest is not number", () => {
    withEnv({
      ...sharedRequiredOpts,
      "INPUT_TAGGED-KEEP-LATEST": "asdf",
      "INPUT_TAG-REGEX": "x",
    });
    assert.throws(() => utils.getConfig(), {
      message: "tagged-keep-latest is not a number",
    });
  });

  test("throw error if tagged keep latest set without regex", () => {
    withEnv({ ...sharedRequiredOpts, "INPUT_TAGGED-KEEP-LATEST": "1" });
    assert.throws(() => utils.getConfig(), {
      message: "regex must be provided when tagged-keep-latest set",
    });
  });
});
