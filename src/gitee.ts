import got, { Got } from "got";
import FormData from "form-data";
import { ReadStream } from "fs";

type Repo = {
  id: number;
  tag_name: string;
  target_commitish: string;
  prerelease: boolean;
  name: string;
  body: string;
  author: {
    url: string;
    html_url: string;
  };
};

type AttachFile = {
  browser_download_url: string;
  id: number;
  name: string;
  size: number;
  uploader: any;
};

export class GiteeClient {
  client: Got;

  constructor(token: string) {
    this.client = got.extend({
      prefixUrl: "https://gitee.com/api/v5",
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": "gitee-client",
      },
    });
  }

  getRepoReleases(parameters: {
    repo: string;
    page?: number;
    per_page?: number;
    direction?: "asc" | "desc";
  }): Promise<Repo> {
    const { page, per_page, direction } = parameters;
    return this.client
      .get(`repos/${parameters.repo}/releases`, {
        searchParams: {
          page,
          per_page,
          direction,
        },
      })
      .json();
  }

  getRepoReleaseByTag(parameters: {
    owner: string;
    repo: string;
    tag_name: string;
  }): Promise<Repo | null> {
    return this.client
      .get(
        `repos/${parameters.owner}/${parameters.repo}/releases/tags/${parameters.tag_name}`
      )
      .json();
  }

  createRepoRelease(parameters: {
    owner: string;
    repo: string;
    tag_name: string;
    name: string;
    body: string;
    prerelease?: boolean;
    target_commitish?: string;
  }): Promise<Repo> {
    return this.client
      .post(`repos/${parameters.owner}/${parameters.repo}/releases`, {
        form: {
          tag_name: parameters.tag_name,
          target_commitish: parameters.target_commitish,
          name: parameters.name,
          body: parameters.body,
          prerelease: parameters.prerelease,
        },
      })
      .json();
  }

  updateRepoRelease(parameters: {
    owner: string;
    repo: string;
    tag_name: string;
    name: string;
    body: string;
    prerelease?: boolean;
    target_commitish?: string;
    id: number;
  }): Promise<Repo> {
    return this.client
      .patch(
        `repos/${parameters.owner}/${parameters.repo}/releases/${parameters.id}`,
        {
          form: {
            tag_name: parameters.tag_name,
            target_commitish: parameters.target_commitish,
            name: parameters.name,
            body: parameters.body,
            prerelease: parameters.prerelease,
          },
        }
      )
      .json();
  }

  getReleasesAttachFiles(parameters: {
    owner: string;
    repo: string;
    release_id: number;
  }): Promise<[AttachFile]> {
    return this.client
      .get(
        `repos/${parameters.owner}/${parameters.repo}/releases/${parameters.release_id}/attach_files`,
        {
          searchParams: {
            page: 1,
            per_page: 100,
          },
        }
      )
      .json();
  }

  uploadReleasesAttachFile(parameters: {
    owner: string;
    repo: string;
    release_id: number;
    file: ReadStream;
  }): Promise<AttachFile> {
    const form = new FormData();
    form.append("file", parameters.file);
    return this.client
      .post(
        `repos/${parameters.owner}/${parameters.repo}/releases/${parameters.release_id}/attach_files`,
        {
          body: form,
          headers: form.getHeaders(),
        }
      )
      .on("uploadProgress", (progress) => {
        console.log(progress);
      })
      .json();
  }

  deletingReleasesAttachFiles(parameters: {
    owner: string;
    repo: string;
    release_id: number;
    attach_file_id: number;
  }) {
    return this.client
      .delete(
        `repos/${parameters.owner}/${parameters.repo}/releases/${parameters.release_id}/attach_files/${parameters.attach_file_id}`
      )
      .json();
  }
}
