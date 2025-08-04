import * as core from "@actions/core";
import * as github from "@actions/github";
import type { graphql } from "@octokit/graphql/types";
import type { PaginateInterface } from "@octokit/plugin-paginate-rest";
import type { Api } from "@octokit/plugin-rest-endpoint-methods";
import consola from "consola";
import { splitOwnerRepo } from "../inputs";

export type PullRequest = {
  base: {
    repo: {
      full_name: string;
      name: string;
      owner: {
        login: string;
      };
    };
  };
  labels: {
    name: string;
  }[];
  number: number;
  state: string;
  title: string;
  user: {
    login: string;
    type: string;
  } | null;
};

export type Repository = {
  archived?: boolean;
  fork: boolean;
  full_name: string;
  name: string;
  owner: {
    login: string;
  };
};

function getPullNumber(): number | undefined {
  const input: string = core.getInput("pull-number");
  if (input === "all") return undefined;
  if (input) return parseInt(input);
  return github.context.payload.pull_request?.number;
}

export function prettyPullRequest(pull: PullRequest): string {
  return `${pull.base.repo.full_name}#${pull.number} by ${pull.user!.login} - ${pull.title}`;
}

export type FilterOptions = {
  authors?: string[];
  bot?: boolean;
  labels?: string[];
};

export class PullRequestFilter {
  readonly authors: string[];
  readonly bot: boolean;
  readonly labels: string[];

  constructor(
    public readonly octokit: Api & {
      graphql: graphql;
      paginate: PaginateInterface;
    },
    options?: FilterOptions,
  ) {
    if (options === undefined) {
      options = {
        authors: core.getMultilineInput("authors"),
        bot: core.getBooleanInput("bot", { required: true }),
        labels: core.getMultilineInput("labels"),
      };
    }
    this.authors = options.authors ?? [];
    this.bot = options.bot ?? true;
    this.labels = options.labels ?? [];
  }

  async *filterPullRequest(pull: PullRequest): AsyncGenerator<PullRequest> {
    if (pull.state !== "open") {
      consola.info(`State: ${pull.state}. Skip ${prettyPullRequest(pull)}`);
      return;
    }
    if (this.authors.length > 0 && !this.authors.includes(pull.user!.login)) {
      consola.info(
        `Author: ${pull.user!.login}. Skip ${prettyPullRequest(pull)}`,
      );
      return;
    }
    if (this.bot && pull.user!.type === "Bot") {
      consola.info(
        `User type: ${pull.user!.type}. Skip ${prettyPullRequest(pull)}`,
      );
      return;
    }
    if (this.labels.length > 0) {
      const labels: string[] = pull.labels.map(
        (label: { name: string }): string => label.name,
      );
      if (
        !this.labels.some((label: string): boolean => labels.includes(label))
      ) {
        consola.info(`Labels: ${labels}. Skip ${prettyPullRequest(pull)}`);
        return;
      }
    }
    return pull;
  }

  async *filterRepository(repository: Repository): AsyncGenerator<PullRequest> {
    if (repository.archived) {
      consola.info(`Repository is archived. Skip ${repository.full_name}`);
      return;
    }
    if (repository.fork) {
      consola.info(`Repository is a fork. Skip ${repository.full_name}`);
      return;
    }
    for await (const { data: pulls } of this.octokit.paginate.iterator(
      this.octokit.rest.pulls.list,
      { owner: repository.owner.login, repo: repository.name, state: "open" },
    )) {
      for (const pull of pulls) yield* this.filterPullRequest(pull);
    }
  }

  async *filterOwner(owner: string): AsyncGenerator<PullRequest> {
    for await (const { data: repositories } of this.octokit.paginate.iterator(
      this.octokit.rest.repos.listForUser,
      { username: owner, type: "owner" },
    )) {
      for (const repository of repositories) {
        yield* this.filterRepository(repository);
      }
    }
  }

  async *filter(): AsyncGenerator<PullRequest> {
    const pull_number: number | undefined = getPullNumber();
    const repository: string = core.getInput("repository", { required: true });
    if (pull_number) {
      const [owner, repo] = splitOwnerRepo(repository);
      const { data: pull } = await this.octokit.rest.pulls.get({
        owner,
        repo,
        pull_number,
      });
      yield* this.filterPullRequest(pull);
    } else {
      const [owner, repo] = repository.split("/");
      if (owner && repo) {
        const { data: repository } = await this.octokit.rest.repos.get({
          owner,
          repo,
        });
        yield* this.filterRepository(repository);
      } else {
        yield* this.filterOwner(owner!);
      }
    }
  }
}
