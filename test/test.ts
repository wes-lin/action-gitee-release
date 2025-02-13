import { GiteeClient } from '../src/client';

const gitee = new GiteeClient('****');

gitee.getRepoReleases({
  owner: '****',
  repo: '****',
}).then((repo) => {
  console.log(repo);
});
