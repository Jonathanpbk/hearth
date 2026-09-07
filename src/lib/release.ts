export interface ReleaseIdentity {
  version: string;
  commit: string;
}

export const installedRelease: ReleaseIdentity = {
  version: __HEARTH_RELEASE_VERSION__,
  commit: __HEARTH_BUILD_SHA__,
};

export function shortCommit(commit: string): string {
  return commit === "development" ? commit : commit.slice(0, 7);
}

export function formatRelease(identity: ReleaseIdentity): string {
  return `v${identity.version} (${shortCommit(identity.commit)})`;
}
