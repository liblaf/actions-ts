import * as core from "@actions/core";
import * as github from "@actions/github";
import type { GitHub } from "@actions/github/lib/utils";
import type { components } from "@octokit/openapi-types";
import consola from "consola";
import { getPullRequestReviewDecision, splitOwnerRepo } from "../../src";

function prettyPullRequest(
  pr: components["schemas"]["pull-request-simple"],
): string {
  return `PR ${pr.base.repo.full_name}#${pr.number} by ${pr.user!.login} - ${pr.title}`;
}

class Reviewer {
  constructor(
    private readonly octokit: InstanceType<typeof GitHub>,
    public readonly authors: string[] = [],
    public readonly bot: boolean = true,
    public readonly labels: string[] = [],
  ) {}

  public async approvePullRequest(
    pr: components["schemas"]["pull-request-simple"],
  ): Promise<void> {
    if (this.authors.length > 0) {
      if (!this.authors.includes(pr.user!.login)) {
        consola.info(`No author match. Skip ${prettyPullRequest(pr)}`);
        return;
      }
    }
    if (this.bot && pr.user!.type !== "Bot") {
      consola.info(`Not a bot. Skip ${prettyPullRequest(pr)}`);
      return;
    }
    if (this.labels.length > 0) {
      if (!pr.labels.some((label) => this.labels.includes(label.name))) {
        consola.info(`No label match. Skip ${prettyPullRequest(pr)}`);
        return;
      }
    }
    const review_decision = await getPullRequestReviewDecision(
      this.octokit.graphql,
      {
        owner: pr.base.repo.owner.login,
        repo: pr.base.repo.name,
        pull_number: pr.number,
      },
    );
    if (review_decision === "APPROVED") {
      consola.info(`Already approved ${prettyPullRequest(pr)}`);
      return;
    }
    await this.octokit.rest.pulls.createReview({
      owner: pr.base.repo.owner.login,
      repo: pr.base.repo.name,
      pull_number: pr.number,
      event: "APPROVE",
    });
    consola.success(`Approved ${prettyPullRequest(pr)}`);
    core.notice(`Approved ${prettyPullRequest(pr)}`);
  }
}

function getPullNumber(): number | undefined {
  const input = core.getInput("pull-number");
  if (input) return parseInt(input);
  return github.context.payload.pull_request?.number;
}

export async function run(): Promise<void> {
  const authors: string[] = core.getMultilineInput("authors");
  const bot: boolean = core.getBooleanInput("bot", { required: true });
  const labels: string[] = core.getMultilineInput("labels");
  const pull_number: number | undefined = getPullNumber();
  const repository: string = core.getInput("repository", { required: true });
  const token: string = core.getInput("token", { required: true });
  const [owner, repo] = splitOwnerRepo(repository);
  const octokit: InstanceType<typeof GitHub> = github.getOctokit(token);
  const reviewer = new Reviewer(octokit, authors, bot, labels);
  if (pull_number) {
    const { data: pr } = await octokit.rest.pulls.get({
      owner,
      repo,
      pull_number,
    });
    reviewer.approvePullRequest(
      pr as components["schemas"]["pull-request-simple"],
    );
  } else {
    octokit.rest.pulls.list({ owner, repo, state: "open" });
    const futures: Promise<void>[] = [];
    for await (const { data: prs } of octokit.paginate.iterator(
      octokit.rest.pulls.list,
      { owner, repo, state: "open" },
    )) {
      for (const pr of prs) {
        futures.push(
          reviewer.approvePullRequest(
            pr as components["schemas"]["pull-request-simple"],
          ),
        );
      }
    }
    await Promise.all(futures);
  }
}
