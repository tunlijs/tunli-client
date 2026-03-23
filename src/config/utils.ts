import {ensureDirectoryExists} from "#core/FS/utils";
import {dirname} from "path";
import * as fs from "node:fs";

export function createLocalConfig(path: string) {
  ensureDirectoryExists(dirname(path))
  fs.writeFileSync(path, JSON.stringify({}))
}
