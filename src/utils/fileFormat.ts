import * as yaml from "js-yaml";
import { TaskFlowFile } from "../types/index.js";

export function isYamlExtension(ext: string) {
  const e = ext.toLowerCase();
  return e === ".yaml" || e === ".yml";
}

export function parseTaskFlowFile(raw: string, ext: string): TaskFlowFile {
  if (isYamlExtension(ext)) {
    const parsed = yaml.load(raw);
    if (typeof parsed !== "object" || parsed === null) {
      throw new Error("Invalid YAML structure");
    }
    return parsed as TaskFlowFile;
  }
  return JSON.parse(raw) as TaskFlowFile;
}

export function stringifyTaskFlowFile(data: TaskFlowFile, ext: string): string {
  if (isYamlExtension(ext)) {
    return yaml.dump(data, {
      indent: 2,
      lineWidth: -1,
      noRefs: true,
      sortKeys: false,
    });
  }
  return JSON.stringify(data, null, 2);
}
