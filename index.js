// SETTING UP THE ACTIVITY WATCHER
var ActivityWatcher = require('ticket-printer').ActivityWatcher;

var aw = new ActivityWatcher({printLogs:true});

// SETTING UP THE WATCH =============================================
var githubWatch = require('ticket-printer').githubWatch;
var GithubApi = require('github');

var apiOptions = {
  protocol: "https",
  host: "api.github.com",
  headers: {
    "user-agent": "ticket-printer"
  },
};
var github = new GithubApi(apiOptions);

// use our authentication to look at private repos
// you can comment these out, if you aren't looking at private repos
// otherwise, create an auth.json file in the root of the project that looks
// like this: {"type": "basic", "username": "user", "password": "pass" }
var auth = require('./auth.json');
github.authenticate(auth);

// make our watch with our query
var query = 'is:open assignee:jrjurman';
var githubAssignments = githubWatch(github, query);
aw.addWatch(githubAssignments, 10000); // 6 times per minute

// we can only start after we have added our watches
aw.start(1000);

// SETTING UP THE PRINTER ===========================================
var tessel = require('tessel');
var tesselPrinterInterface = require('tessel-thermalprinter');
var printer = tesselPrinterInterface.use(tessel.port['A']);

var thermalPrinter = require('ticket-printer').thermalPrinter(printer);

printer.on('ready', function() {
  aw.addPrinter(thermalPrinter);
});
