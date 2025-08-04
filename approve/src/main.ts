import * as core from "@actions/core";
import * as github from "@actions/github";
import type { Octokit } from "octokit";
import { Reviewer, splitOwnerRepo } from "../../shared";

function getPullNumber(): number | undefined {
  const input: string = core.getInput("pull-number");
  if (input === "all") return undefined;
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
  const octokit: Octokit = github.getOctokit(token) as unknown as Octokit;
  const reviewer = new Reviewer(octokit, authors, bot, labels);
  if (pull_number) {
    const [owner, repo] = splitOwnerRepo(repository);
    const { data: pull } = await octokit.rest.pulls.get({
      owner,
      repo,
      pull_number,
    });
    await reviewer.approvePullRequest(pull);
    return;
  }
  const [owner, repo] = repository.split("/");
  if (owner && repo) {
    const { data: repository } = await octokit.rest.repos.get({ owner, repo });
    await reviewer.approveRepository(repository);
    return;
  }
  if (owner) {
    await reviewer.approveOwner(owner);
    return;
  }
  throw new Error(`Input required and not supplied: repository`);
}
