import * as core from "@actions/core";
import * as github from "@actions/github";
import { Reviewer, splitOwnerRepo } from "../../src";

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
  const octokit = github.getOctokit(token);
  const reviewer = new Reviewer(authors, bot, labels);
  if (pull_number) {
    const { data: pull } = await octokit.rest.pulls.get({
      owner,
      repo,
      pull_number,
    });
    octokit.rest;
    await reviewer.approvePullRequest(octokit as any, pull);
  } else {
    const { data: repository } = await octokit.rest.repos.get({ owner, repo });
    await reviewer.approveRepository(octokit as any, repository);
  }
}
