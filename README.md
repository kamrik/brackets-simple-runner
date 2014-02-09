brackets-simple-runner
======================

A Brackets extension to run a script and parse clickable links from the stack trace.

The command is available under File -> Run runner or Ctrl-F9. It runs a script called "go" from the currently open project dir. For now it can only parse Node.js stack trace.

It only collects stdout, so you need to redirect stderr into stdout yourself in the go script.

Example script

    node mycoolapp.js 2>&1 
