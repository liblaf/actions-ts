import consola from "consola";
import { splitOwnerRepo } from "../../../lib";
import type { Octokit, Release } from "./types";
import { waitForReleaseDeletion } from "./wait";

export async function deleteRelease(
  octokit: Octokit,
  repository: string,
  release: Release,
): Promise<void> {
  const [owner, repo] = splitOwnerRepo(repository);
  await octokit.rest.repos.deleteRelease({
    owner,
    repo,
    release_id: release.id,
  });
  await octokit.rest.git.deleteRef({
    owner,
    repo,
    ref: `tags/${release.tag_name}`,
  });
  // workaround for: <https://github.com/cli/cli/issues/5024#issuecomment-1028018586>
  await waitForReleaseDeletion(octokit, repository, release.tag_name);
  consola.success(`Deleted release ${release.tag_name} in ${repository}.`);
}
