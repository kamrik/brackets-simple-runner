// Node.js layer
// See some documentation about brackets Node.js process at
// https://github.com/adobe/brackets/wiki/Brackets-Node-Process:-Overview-for-Developers

/* jshint node:true */

var child_process = require('child_process');
var path = require('path');

function cmdRunAll(script, errback) {
    var opts = { cwd: path.dirname(script) };
    var child = child_process.exec(script, opts, function (error, stdout, stderr) {
        var result = {
            error: error,
            stdout: stdout,
            stderr: stderr
        };
        errback(null, result);
    });
}

function init(DomainManager) {
    if (!DomainManager.hasDomain("brunner")) {
        DomainManager.registerDomain("brunner", {major: 0, minor: 1});
    }

    DomainManager.registerCommand(
        "brunner",       // domain name
        "runAll",    // command name
        cmdRunAll,   // command handler function
        true,          // this command is synchronous
        "returns the output",
        [],             // no parameters
        [{name: "",
          type: "",
          description: ""}]
    );
}

exports.init = init;
