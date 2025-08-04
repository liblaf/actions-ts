import * as core from "@actions/core";
import * as github from "@actions/github";
import type { Octokit } from "octokit";
import { PullRequestFilter } from "../../shared";

export async function run(): Promise<void> {
  const addLabels: string[] = core.getMultilineInput("add-labels", {
    required: true,
  });
  const token: string = core.getInput("token", { required: true });
  const octokit = github.getOctokit(token) as unknown as Octokit;
  const filter = new PullRequestFilter(octokit);
  const futures: Promise<any>[] = [];
  for await (const pull of filter.filter()) {
    futures.push(
      octokit.rest.issues.addLabels({
        owner: pull.base.repo.owner.login,
        repo: pull.base.repo.name,
        issue_number: pull.number,
        labels: addLabels,
      }),
    );
  }
  await Promise.all(futures);
}
