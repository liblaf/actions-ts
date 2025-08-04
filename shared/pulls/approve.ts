import * as core from "@actions/core";
import type { graphql } from "@octokit/graphql/types";
import type { PaginateInterface } from "@octokit/plugin-paginate-rest";
import type { Api } from "@octokit/plugin-rest-endpoint-methods";
import consola from "consola";
import { getPullRequestReviewDecision } from "./review-decision";

interface PullRequest {
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
}

interface Repository {
  archived?: boolean;
  fork: boolean;
  full_name: string;
  name: string;
  owner: {
    login: string;
  };
}

export function prettyPullRequest(pull: PullRequest): string {
  return `${pull.base.repo.full_name}#${pull.number} by ${pull.user!.login} - ${pull.title}`;
}

export class Reviewer {
  constructor(
    private readonly reviewOctokit: Api,
    public readonly authors: string[] = [],
    public readonly bot: boolean = true,
    public readonly labels: string[] = [],
  ) {}

  public async approvePullRequest(
    octokit: { graphql: graphql },
    pull: PullRequest,
  ): Promise<void> {
    if (pull.state !== "open") {
      consola.info(`State: ${pull.state}. Skip ${prettyPullRequest(pull)}`);
      return;
    }
    if (this.authors.length > 0) {
      if (!this.authors.includes(pull.user!.login)) {
        consola.info(
          `Author: ${pull.user!.login}. Skip ${prettyPullRequest(pull)}`,
        );
        return;
      }
    }
    if (this.bot && pull.user!.type !== "Bot") {
      consola.info(
        `User Type: ${pull.user!.login}. Skip ${prettyPullRequest(pull)}`,
      );
      return;
    }
    if (this.labels.length > 0) {
      const labels: string[] = pull.labels.map((label) => label.name);
      if (!labels.some((label) => this.labels.includes(label))) {
        consola.info(`Labels: ${pull.labels}. Skip ${prettyPullRequest(pull)}`);
        return;
      }
    }
    const reviewDecision = await getPullRequestReviewDecision(octokit.graphql, {
      owner: pull.base.repo.owner.login,
      repo: pull.base.repo.name,
      pull_number: pull.number,
    });
    if (reviewDecision !== "REVIEW_REQUIRED") {
      consola.info(
        `Review Decision: ${reviewDecision}. Skip ${prettyPullRequest(pull)}`,
      );
      return;
    }
    await this.reviewOctokit.rest.pulls.createReview({
      owner: pull.base.repo.owner.login,
      repo: pull.base.repo.name,
      pull_number: pull.number,
      event: "APPROVE",
    });
    consola.success(`Approved ${prettyPullRequest(pull)}`);
    core.notice(`Approved ${prettyPullRequest(pull)}`);
  }

  public async approveRepository(
    octokit: Api & { graphql: graphql; paginate: PaginateInterface },
    repository: Repository,
  ): Promise<void> {
    if (repository.archived) {
      consola.info(`Repository is archived. Skip ${repository.full_name}`);
      return;
    }
    if (repository.fork) {
      consola.info(`Repository is a fork. Skip ${repository.full_name}`);
      return;
    }
    const futures: Promise<void>[] = [];
    for await (const { data: pulls } of octokit.paginate.iterator(
      octokit.rest.pulls.list,
      {
        owner: repository.owner.login,
        repo: repository.name,
        state: "open",
      },
    )) {
      for (const pull of pulls)
        futures.push(this.approvePullRequest(octokit, pull));
    }
    await Promise.all(futures);
  }

  public async approveOwner(
    octokit: Api & { graphql: graphql; paginate: PaginateInterface },
    owner: string,
  ): Promise<void> {
    const futures: Promise<void>[] = [];
    for await (const { data: repositories } of octokit.paginate.iterator(
      octokit.rest.repos.listForUser,
      {
        username: owner,
        type: "owner",
      },
    )) {
      for (const repository of repositories) {
        futures.push(this.approveRepository(octokit, repository));
      }
    }
    await Promise.all(futures);
  }
}
