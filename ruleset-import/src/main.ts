import * as core from "@actions/core";
import * as github from "@actions/github";
import type { GitHub } from "@actions/github/lib/utils";
import type { components } from "@octokit/openapi-types";
import consola from "consola";
import { splitOwnerRepo } from "../../shared";

type Octokit = InstanceType<typeof GitHub>;
type Ruleset = components["schemas"]["repository-ruleset"];

async function getRuleset(
  octokit: Octokit,
  repository: string,
  name: string,
): Promise<Ruleset | undefined> {
  const [owner, repo] = splitOwnerRepo(repository);
  for await (const { data: rulesets } of octokit.paginate.iterator(
    octokit.rest.repos.getRepoRulesets,
    { owner, repo },
  )) {
    const ruleset: Ruleset | undefined = rulesets.find(
      (r: Ruleset): boolean => r.name === name,
    );
    if (ruleset) return ruleset;
  }
}

export async function run(): Promise<void> {
  const name: string = core.getInput("name", { required: true });
  const token: string = core.getInput("token", { required: true });
  const sourceRepository: string = core.getInput("source-repository", {
    required: true,
  });
  const targetRepository: string = core.getInput("target-repository", {
    required: true,
  });
  const octokit = github.getOctokit(token);

  const sourceRulesetSimple: Ruleset | undefined = await getRuleset(
    octokit,
    sourceRepository,
    name,
  );
  if (!sourceRulesetSimple) {
    throw new Error(
      `Ruleset "${name}" not found in repository "${sourceRepository}".`,
    );
  }
  const [sourceOwner, sourceRepo] = splitOwnerRepo(sourceRepository);
  const { data: sourceRuleset } = await octokit.rest.repos.getRepoRuleset({
    owner: sourceOwner,
    repo: sourceRepo,
    ruleset_id: sourceRulesetSimple.id,
  });

  const targetRulesetSimple: Ruleset | undefined = await getRuleset(
    octokit,
    targetRepository,
    name,
  );
  const [owner, repo] = splitOwnerRepo(targetRepository);
  if (targetRulesetSimple) {
    await octokit.rest.repos.updateRepoRuleset({
      owner,
      repo,
      ruleset_id: targetRulesetSimple.id,
      name: sourceRuleset.name,
      target: sourceRuleset.target as any,
      enforcement: sourceRuleset.enforcement,
      bypass_actors: sourceRuleset.bypass_actors as any,
      conditions: sourceRuleset.conditions as any,
      rules: sourceRuleset.rules as any,
    });
    const msg: string = `Update ruleset "${name}" in repository "${targetRepository}"`;
    consola.success(msg);
    core.notice(msg);
  } else {
    await octokit.rest.repos.createRepoRuleset({
      owner,
      repo,
      name: sourceRuleset.name,
      target: sourceRuleset.target as any,
      enforcement: sourceRuleset.enforcement,
      bypass_actors: sourceRuleset.bypass_actors as any,
      conditions: sourceRuleset.conditions as any,
      rules: sourceRuleset.rules as any,
    });
    const msg: string = `Create ruleset "${name}" in repository "${targetRepository}"`;
    consola.success(msg);
    core.notice(msg);
  }
}
