import {exec} from 'child_process';
import {dirname, join} from 'path';

export const checkGlobalInstallation = (packageName: string) => {
  return new Promise((resolve) => {
    exec(`npm list -g --depth=0 ${packageName}`, (_error, stdout) => {
      if (stdout.includes(packageName)) {
        resolve(true)
      } else {
        resolve(false)
      }
    });
  });
};

export const checkLocalInstallation = (packageName: string) => {
  const localPath = join(process.cwd(), 'node_modules', packageName)
  return new Promise((resolve) => {
    exec(`npm list --depth=0 ${packageName}`, {cwd: dirname(process.argv[1]!)}, (_error, stdout) => {
      if (stdout.includes(localPath)) {
        resolve(true)
      } else {
        resolve(false)
      }
    })
  })
}
