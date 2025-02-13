import got, { Got } from 'got';
import FormData from 'form-data';

type Repo = {
  id?: number,
  tag_name: string,
  target_commitish: string,
  prerelease: boolean,
  name: string,
  body: string,
};

export class GiteeClient {
    client: Got;

    constructor(token: string) {
      this.client = got.extend({
        prefixUrl: 'https://gitee.com/api/v5',
        headers: {
          Authorization: `Bearer ${token}`,
          'User-Agent': 'gitee-client',
        },
      });
    }

    getRepoReleases(parameters: {
      owner: string,
      repo: string,
      page?: number,
      per_page?: number,
      direction?: 'asc' | 'desc',
    }): Promise<Repo> {
      const { page, per_page, direction } = parameters;
      return this.client.get(`repos/${parameters.owner}/${parameters.repo}/releases`, {
        searchParams: {
          page, per_page, direction,
        },
      }).json();
    }

    createRepoRelease(parameters: { owner: string,
      repo: string,
      tag_name: string,
      name: string,
      body: string,
      prerelease?: boolean,
      target_commitish: string,
    }): Promise<{
      id: number
    }> {
      return this.client.post(`repos/${parameters.owner}/:${parameters.repo}/releases`, {
        form: {
          tag_name: parameters.tag_name,
          target_commitish: parameters.target_commitish,
          name: parameters.name,
          body: parameters.body,
          prerelease: parameters.prerelease,
        },
      }).json();
    }

    uploadReleasesAttachFile(parameters: {owner: string,
      repo: string, release_id: string, file: File}): Promise<any> {
      const form = new FormData();
      form.append('file', parameters.file);
      return this.client.post(`repos/${parameters.owner}/${parameters.repo}/releases/${parameters.release_id}/attach_files`, {
        body: form,
        headers: form.getHeaders(),
      }).json();
    }
}
