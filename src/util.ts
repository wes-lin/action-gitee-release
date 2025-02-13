import { statSync } from "fs";
import * as glob from "glob";

export interface Config {
  gitee_token: string;
  gitee_ref: string;
  gitee_repository: string;
  // user provided
  input_name?: string;
  input_tag_name?: string;
  input_body: string;
  input_files?: string[];
  input_prerelease?: boolean;
}

type Env = { [key: string]: string | undefined };

export const parseInputFiles = (files: string): string[] => {
  return files.split(/\r?\n/).reduce<string[]>(
    (acc, line) =>
      acc
        .concat(line.split(","))
        .filter((pat) => pat)
        .map((pat) => pat.trim()),
    []
  );
};

export const parseConfig = (env: Env): Config => {
  return {
    gitee_token: env.INPUT_TOKEN || "",
    gitee_ref: env.GITHUB_REF || "",
    gitee_repository: env.INPUT_REPOSITORY || "",
    input_name: env.INPUT_NAME,
    input_tag_name: env.INPUT_TAG_NAME?.trim(),
    input_body: env.INPUT_BODY || "",
    input_files: parseInputFiles(env.INPUT_FILES || ""),
    input_prerelease: env.INPUT_PRERELEASE
      ? env.INPUT_PRERELEASE == "true"
      : false,
  };
};

export const paths = (patterns: string[]): string[] => {
  return patterns.reduce((acc: string[], pattern: string): string[] => {
    return acc.concat(
      glob.sync(pattern).filter((path) => statSync(path).isFile())
    );
  }, []);
};

export const unmatchedPatterns = (patterns: string[]): string[] => {
  return patterns.reduce((acc: string[], pattern: string): string[] => {
    return acc.concat(
      glob.sync(pattern).filter((path) => statSync(path).isFile()).length == 0
        ? [pattern]
        : []
    );
  }, []);
};

export const isTag = (ref: string): boolean => {
  return ref.startsWith("refs/tags/");
};
