var process = require('process');
var child_process = require('child_process');

process.chdir(__dirname + '/..');

exports.run = function (commandline) {
    console.log('> ' + commandline);

    try {
      child_process.execSync(commandline, { stdio: 'inherit' });
    } catch (ex) {
      console.log();
      console.log("Command failed: " + commandline);
      process.exit(2);
    }
}
