import {exec} from 'child_process';
import {dirname, join} from 'path';

export const checkGlobalInstallation = (packageName) => {
  return new Promise((resolve, reject) => {
    exec(`npm list -g --depth=0 ${packageName}`, (error, stdout, stderr) => {
      if (stdout.includes(packageName)) {
        resolve(true)
      } else {
        resolve(false)
      }
    });
  });
};

export const checkLocalInstallation = (packageName) => {
  const localPath = join(process.cwd(), 'node_modules', packageName)
  return new Promise((resolve, reject) => {
    exec(`npm list --depth=0 ${packageName}`, {cwd: dirname(process.argv[1])}, (error, stdout, stderr) => {
      if (stdout.includes(localPath)) {
        resolve(true)
      } else {
        resolve(false)
      }
    })
  })
}
