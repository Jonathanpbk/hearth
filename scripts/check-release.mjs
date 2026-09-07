import { readFile } from "node:fs/promises";

const packageJson = JSON.parse(
  await readFile(new URL("../package.json", import.meta.url), "utf8")
);
const changelog = await readFile(
  new URL("../CHANGELOG.md", import.meta.url),
  "utf8"
);

const version = packageJson.version;
if (!/^\d+\.\d+\.\d+$/.test(version)) {
  throw new Error(`package.json has an invalid release version: ${version}`);
}

if (!changelog.includes(`## [${version}]`)) {
  throw new Error(`CHANGELOG.md has no release entry for ${version}`);
}

if (process.env.GITHUB_REF_TYPE === "tag") {
  const expectedTag = `v${version}`;
  if (process.env.GITHUB_REF_NAME !== expectedTag) {
    throw new Error(
      `Release tag ${process.env.GITHUB_REF_NAME} does not match ${expectedTag}`
    );
  }
}

console.log(`Hearth v${version} release metadata is consistent`);
