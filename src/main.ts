import { env } from "process";
import { setFailed, setOutput } from "@actions/core";
import { Config, isTag, parseConfig, paths, unmatchedPatterns } from "./util";
import { GiteeClient } from "./gitee";
import { HTTPError } from "got";
import { getType } from "mime";
import { statSync, createReadStream } from "fs";
import { basename } from "path";

async function run() {
  try {
    const config = parseConfig(env);
    if (!config.gitee_token) {
      throw new Error(`⚠️ Gitee Releases requires Personal Access Token`);
    }
    if (!config.gitee_repository) {
      throw new Error(`⚠️ Gitee Releases requires Repository`);
    }
    if (!config.input_tag_name && !isTag(config.gitee_ref)) {
      throw new Error(`⚠️ Gitee Releases requires a tag`);
    }
    if (!config.input_body) {
      throw new Error(`⚠️ Gitee Releases requires Description`);
    }
    if (config.input_files) {
      const patterns = unmatchedPatterns(config.input_files);
      patterns.forEach((pattern) => {
        console.warn(`🤔 Pattern '${pattern}' does not match any files.`);
      });
    }
    const gitee = new GiteeClient(config.gitee_token);
    const [, repo] = config.gitee_repository.split("/");
    let rel = await release(config, gitee);

    if (config.input_files && config.input_files.length > 0) {
      const files = paths(config.input_files);
      if (files.length === 0) {
        console.warn(`🤔 ${config.input_files} does not include a valid file.`);
      }
      const uploadFile = async (path: string) => {
        const attach = await upload(config, gitee, rel.id, path);
        delete attach?.uploader;
        return attach;
      };

      const assets = await Promise.all(files.map(uploadFile));
      setOutput("assets", assets);
    }

    const url = `${rel.author.html_url}/${repo}/releases/tag/${rel.tag_name}`;
    console.log(`🎉 Release ready at ${url}`);
    setOutput("url", url);
    setOutput("id", rel.id.toString());
  } catch (error) {
    if (error instanceof HTTPError) {
      if (error.response) {
        setFailed(`Response error:${error.response.body}`);
      } else {
        setFailed(error.message);
      }
    } else if (error instanceof Error) {
      setFailed(error.message);
    }
  }
}

const release = async (config: Config, gitee: GiteeClient) => {
  const [owner, repo] = config.gitee_repository.split("/");
  const tag =
    config.input_tag_name ||
    (isTag(config.gitee_ref) ? config.gitee_ref.replace("refs/tags/", "") : "");
  const name = config.input_name || tag;
  const prerelease = config.input_prerelease;
  const body = config.input_body;
  const _release = await gitee.getRepoReleaseByTag({
    owner,
    repo,
    tag_name: tag,
  });
  let rel;
  if (_release) {
    rel = await gitee.updateRepoRelease({
      owner,
      repo,
      tag_name: tag,
      name,
      prerelease,
      body,
      target_commitish: "master",
      id: _release.id,
    });
  } else {
    rel = await gitee.createRepoRelease({
      owner,
      repo,
      tag_name: tag,
      name,
      prerelease,
      body,
      target_commitish: "master",
    });
  }
  return rel;
};

interface ReleaseAsset {
  name: string;
  mime: string;
  size: number;
}

const mimeOrDefault = (path: string): string => {
  return getType(path) || "application/octet-stream";
};

const asset = (path: string): ReleaseAsset => {
  return {
    name: basename(path),
    mime: mimeOrDefault(path),
    size: statSync(path).size,
  };
};

const upload = async (
  config: Config,
  gitee: GiteeClient,
  release_id: number,
  path: string
) => {
  const [owner, repo] = config.gitee_repository.split("/");
  const { name, mime, size } = asset(path);
  const attachs = await gitee.getReleasesAttachFiles({
    owner,
    repo,
    release_id,
  });
  const currentAttachs = attachs.find(
    ({ name: currentName }) => currentName === name
  );
  if (currentAttachs) {
    console.log(`♻️ Deleting previously uploaded asset ${name}...`);
    await gitee.deletingReleasesAttachFiles({
      owner,
      repo,
      release_id,
      attach_file_id: currentAttachs.id,
    });
  }
  console.log(`⬆️ Uploading ${name}...`);
  const fh = createReadStream(path);
  try {
    const res = await gitee.uploadReleasesAttachFile({
      owner,
      repo,
      release_id,
      file: fh,
    });
    console.log(`✅ Uploaded ${name}`);
    return res;
  } catch (error) {
    if (error instanceof HTTPError) {
      throw new Error(
        `Failed to upload release asset ${name}. received status code ${
          error.code
        }\n${error.message}\n${JSON.stringify(error.response.body)}`
      );
    } else if (error instanceof Error) {
      throw new Error(
        `Failed to upload release asset ${name}.\n${error.message}}`
      );
    }
  } finally {
    fh.close();
  }
};

run();
