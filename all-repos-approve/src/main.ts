import * as core from "@actions/core";
import type { App } from "octokit";
import { makeApp, Reviewer } from "../../src";

export async function run(): Promise<void> {
  const appId = Number.parseInt(core.getInput("app-id", { required: true }));
  const authors = core.getMultilineInput("authors");
  const bot = core.getBooleanInput("bot", { required: true });
  const labels = core.getMultilineInput("labels");
  const privateKey = core.getInput("private-key", { required: true });
  const app: App = makeApp({ appId, privateKey });
  const reviewer = new Reviewer(authors, bot, labels);
  const futures: Promise<void>[] = [];
  for await (const { octokit, repository } of app.eachRepository.iterator())
    futures.push(reviewer.approveRepository(octokit, repository));
  await Promise.all(futures);
}
