import {dirnameFromMeta, readJsonFile, searchFileInDirectoryTree} from "#src/core/FS/utils";
import {program} from 'commander';
import {createCommandHTTP} from "#commands/CommandHTTP";
import {createCommandAuth} from "#commands/CommandAuth";
import {createCommandConfig} from "#commands/CommandConfig";
import {createCommandRegister} from "#commands/CommandRegister";
import {createCommandRefresh} from "#commands/CommandRefresh";
import {argumentAliasResolver} from "#commands/helper/AliasResolver";
import {createCommandInvite} from "#commands/CommandInvite";
import {addExamples, addUsage} from "#commands/utils";

program
  .name('tunli')
  .description('HTTP tunnel client')
  .option('-v, --version', 'version', () => {
    const packageJson = readJsonFile(searchFileInDirectoryTree('package.json', dirnameFromMeta(import.meta)))
    console.log(`tunli: ${packageJson.version}`)
    process.exit()
  })

program.addCommand(createCommandConfig(program))
program.addCommand(createCommandHTTP(program), {isDefault: true})
program.addCommand(createCommandRegister(program))
program.addCommand(createCommandRefresh(program))
program.addCommand(createCommandInvite(program))
program.addCommand(createCommandAuth(program))

addExamples(program)
addUsage(program)

await program.parseAsync(argumentAliasResolver());
