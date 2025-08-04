import * as core from "@actions/core";
import * as github from "@actions/github";
import consola from "consola";
import type { Octokit } from "octokit";
import type { PullRequestReviewDecision } from "../../shared";
import {
  getPullRequestReviewDecision,
  PullRequestFilter,
  prettyPullRequest,
} from "../../shared";

export async function run(): Promise<void> {
  const token: string = core.getInput("token", { required: true });
  const octokit = github.getOctokit(token) as unknown as Octokit;
  const filter = new PullRequestFilter(octokit);
  for await (const pull of filter.filter()) {
    const reviewDecision: PullRequestReviewDecision =
      await getPullRequestReviewDecision(octokit.graphql, {
        owner: pull.base.repo.owner.login,
        repo: pull.base.repo.name,
        pull_number: pull.number,
      });
    if (reviewDecision === "REVIEW_REQUIRED") {
      await octokit.rest.pulls.createReview({
        owner: pull.base.repo.owner.login,
        repo: pull.base.repo.name,
        pull_number: pull.number,
        event: "APPROVE",
      });
      consola.success(`Approved ${prettyPullRequest(pull)}`);
      core.notice(`Approved ${prettyPullRequest(pull)}`);
    }
  }
}
