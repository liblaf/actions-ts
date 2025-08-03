import * as core from "@actions/core";
import * as github from "@actions/github";
import type { App } from "octokit";
import { makeApp, Reviewer } from "../../src";

export async function run(): Promise<void> {
  const appId = Number.parseInt(core.getInput("app-id", { required: true }));
  const authors = core.getMultilineInput("authors");
  const bot = core.getBooleanInput("bot", { required: true });
  const labels = core.getMultilineInput("labels");
  const privateKey = core.getInput("private-key", { required: true });
  const token = core.getInput("token");
  const app: App = makeApp({ appId, privateKey });
  const reviewer = new Reviewer(
    token ? (github.getOctokit(token) as any) : app.octokit,
    authors,
    bot,
    labels,
  );
  const futures: Promise<void>[] = [];
  for await (const { octokit, repository } of app.eachRepository.iterator())
    futures.push(reviewer.approveRepository(octokit, repository));
  await Promise.all(futures);
}
