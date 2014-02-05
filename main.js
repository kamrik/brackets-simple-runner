/*
ABOUT

This Brackets extenstion will execute a script named "go" in the root of the
currently open dir or project.

The output is parsed, displayed in a bottom panel. Stack trace lines with file
names and line number become clickable links that will point the editor to the
right location.

Stack trace parsing is Node.js specific.
*/

/* jshint laxcomma:true, asi:true, debug:true, unused:true */
/* global define, brackets, $ */

define(function (require, exports, module) {
    "use strict";


    // Load a bunch of Brackets modules
    var CommandManager = brackets.getModule("command/CommandManager")
      , EditorManager = brackets.getModule("editor/EditorManager")
      , Menus = brackets.getModule("command/Menus")
      , KeyBindingManager = brackets.getModule("command/KeyBindingManager")
      , NodeConnection = brackets.getModule("utils/NodeConnection")
      , ExtensionUtils = brackets.getModule("utils/ExtensionUtils")
      , PanelManager   = brackets.getModule("view/PanelManager")
      , ProjectManager = brackets.getModule("project/ProjectManager")
      , FileViewController = brackets.getModule("project/FileViewController")

    var extenstionPath = ExtensionUtils.getModulePath(module)
      , nodeRunnerPath = extenstionPath + 'node_runner'  // Path to node_runner.js
      , linkRe = /(\/.*js:\d+:\d+)/
      , lastOutput

    // Create the DOM element for bottom panel
    ExtensionUtils.loadStyleSheet(module, "runner.css");
    var panel_html = require("text!panel.html")
      , panel = PanelManager.createBottomPanel("runner", $(panel_html))

    // Hide the panel when the [x] in top rght corner is clicked.
    $('#runner-panel-close').click(function () { panel.hide() });

    // Register the command
    var RUNNER_COMMAND_ID = "kamrik.brackets.runner"
    CommandManager.register("Run runner", RUNNER_COMMAND_ID, handleRunner)

    // Create a menu item.
    // TODO: Move it to place more logical than next to File->Quit
    var menu = Menus.getMenu(Menus.AppMenuBar.FILE_MENU);
    menu.addMenuItem(RUNNER_COMMAND_ID);

    // TODO: What are the most common shortcuts for running the code? Ctrl-F9 is from my Borland Pascal days.
    KeyBindingManager.addBinding(RUNNER_COMMAND_ID, { key: "Ctrl-F9" });


    // Handle click on a trace line with file name and line number
    // A typical trace looks lie this:
    //
    // Error: ENOENT, no such file or directory '/bad/file/path'
    //    at Object.openSync (fs.js:230:18)
    //    at Object.readFileSync (fs.js:120:15)
    //    at readMyFile (/path/to/some/code/example.js:10:6)
    //    at doStuff (/path/to/some/code/example.js:5:10)
    //    at Object.<anonymous> (/path/to/some/code/example.js:13:1)
    //    at Module._compile (module.js:441:26)
    //    at Object..js (module.js:459:10)
    //    at Module.load (module.js:348:31)
    //
    function onClick(e) {
        var traceline = e.currentTarget.dataset.traceline
          , parts = traceline.split(':')
          , filePath = parts[0]
          , line = parseInt(parts[1]) - 1
          , ch = parseInt(parts[2])
          , docPromise = FileViewController.openAndSelectDocument(filePath, FileViewController.PROJECT_MANAGER)

        docPromise.then(function () {
            var editor = EditorManager.getCurrentFullEditor()
            if (editor) {
                editor.setCursorPos(line, ch, true)
                EditorManager.focusEditor()
            }
        })
        .done()
    }

    // Handler for the File->Run command
    function handleRunner() {
        // root dir of the currently open project
        var projectDir = ProjectManager.getProjectRoot().fullPath;
        // path of the script to execute. TODO: make this configurable
        var scriptPath = projectDir + '/go'

        // Find the <table> element that will hold the output.
        var $output = $('#runner-output')
        $output.html('running...')
        panel.show();

        // Function to process output returned by the executable.
        // result is an object, we only consider result.strdout. Redired stderr to stdout in your executable.
        function processOutput(result) {
            $output.html('')
            lastOutput = result
            var i, line
            var text = result.stdout;
            var lines = text.split('\n');

            // Go over the output line by line
            // convert parts like /path/file.js:99:99 to <a> elemtns.
            // add the line to output panel and <tr><td><pre>line</pre></td></tr>.
            for(i = 0; i < lines.length; i++) {
                line = lines[i];
                var m = linkRe.exec(line)
                if (m) {
                    // Display the file name with the project path stripped for better readability.
                    var shortName = m[1].replace(projectDir, '')
                    line = line.replace(m[1], '<a href="#" data-traceline="' + m[1] + '">' + shortName + '</a>')
                }
                line = '<tr><td><pre>' + line + '</pre></td></tr>'
                $output.append(line)
            }

            // Register the on-click handler for all <a> elements,
            $('a', $output).click(onClick);
        }


        // Connect to the Brackets Node.js process, register the node side function and then run it.
        // See: github.com/adobe/brackets/wiki/Brackets-Node-Process:-Overview-for-Developers
        var nodeConnection = new NodeConnection();
        nodeConnection.connect(true)
        .then(function () {
            return nodeConnection.loadDomains([nodeRunnerPath], true)
        })
        .then(function () {
            return nodeConnection.domains.brunner.runAll(scriptPath)
        })
        .then(processOutput)
        .fail(function (err) {
            $output.html('<pre> Error communicating with node.js:\n' + err.toString() + '\n\n' + err.stack )
        })
        .always(function () {
            //debugger
        })
        .done()
    }
});
