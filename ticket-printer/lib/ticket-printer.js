'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
/**
  consolePrinter.js
  Printer object that prints to the console
*/

var consolePrinter = exports.consolePrinter = {

  /* name of the printer */
  name: "Console Printer",

  /* printTicket function to display the ticket */
  printTicket: function (ticket) {
    var ticketPrintOut = `
================Ticket-Start================
WATCH: ${ ticket.watch }
PROJECT: ${ ticket.project }
TICKET: ${ ticket.title } #${ ticket.number }

${ ticket.body }
=================Ticket-End=================
`;

    // split and re-merge the lines by a specific number of characters
    var width = 44;

    // split the lines by newline, and create a new list of lines,
    var finalPrintOut = ticketPrintOut.split('\n').reduce(function (finalLines, currentLine) {

      // split the current line by a given width,
      var splitLines = currentLine.match(new RegExp(`.{1,${ width }}`, 'g'));

      // and re-join them into the final lines
      return finalLines.concat(splitLines);
    }, []).join('\n');

    // printing the ticket
    console.log(finalPrintOut);
  }
};

exports.default = consolePrinter;
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var thermalPrinter = exports.thermalPrinter = function (printer) {
  return {
    name: "Thermal Printer",
    printTicket: function (ticket) {
      printer.center().horizontalLine(32).printLine(ticket.watch).inverse(true).printLine(` ${ ticket.project } `).inverse(false).lineFeed(1).big(true).printLine(`${ ticket.title } #${ ticket.number }`).big(false).lineFeed(1).printLine(ticket.body).lineFeed(10).print(function () {});
    }
  };
};
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
/**
  ActivityWatcher class,
  Collects watch and hook objects, and sends tickets to printers
*/
class ActivityWatcher {

  /**
    constructor([environment])
    takes in an  environment object, which has the following properties:
      printLogs -> (bool) will print to console.log when events occur
  */
  constructor(environment) {
    this.printers = [];
    this.watches = [];
    this.hooks = [];
    this.printQueue = [];
    this.env = environment || {};

    this.log = function (log) {
      if (this.env.printLogs) {
        console.log(log);
      }
    };

    this.log("New Activity Watcher Created");
  }

  /**
    start(printInterval)
    will start a loop for checking the print queue, and will start all the
    watches. printInterval is how often the ActivityWatcher will check for
    tickets in the print queue.
  */
  start(printInterval) {
    var _this = this;

    /* print loop */
    this.startInterval = setInterval(() => {
      if (this.printQueue.length > 0) {
        this.log(`${ this.printQueue.length } in the print queue`);
      }

      var _loop = function () {
        var ticket = _this.printQueue.pop();
        _this.printers.forEach(printer => {
          printer.printTicket(ticket);
        });
      };

      while (this.printQueue.length > 0) {
        _loop();
      }
    }, printInterval);

    /* start all the watches */
    this.watches.forEach(watch => {

      var setIntervalId = setInterval(() => {
        this.log(`Checking for Tickets from ${ watch.name }`);
        watch.getTicketObjects(this.printQueue);
      }, watch._interval);

      /* add close function to watch to remove the watch interval */
      watch.close = function () {
        clearInterval(setIntervalId);
      };
    });
  }

  /**
    addPrinter(printer)
    adds a printer object for watches and hooks to print to
    must have the following properties:
      name -> (string) name of the printer
      printTicket -> (function) function to print ticket object
        printTicket takes in a single parameter, the ticket object
  */
  addPrinter(printer) {
    this.log(`Adding ${ printer.name }`);

    this.printers.push(printer);

    this.log(`Added ${ printer.name }`);
  }

  /**
    addWatch(watch, interval)
    adds a watch object for printing tickets at an intervals
    interval -> (integer) how long in ms to check for new tickets
    watch must have the following properties:
      name -> (string) name of the watch
      getTicketObjects -> (function) function to get ticket objects, returns a
        list of new tickets to print
  */
  addWatch(watch, interval) {
    this.log(`Adding ${ watch.name }`);

    /* attach interval parameter to watch object*/
    watch._interval = interval;
    this.watches.push(watch);

    this.log(`Added ${ watch.name }`);
  }

  /**
    addHook(hook)
    adds a hook object for printing tickets when an event occurs
    TODO: This has yet to be defined
  */
  addHook(hook) {
    this.log(`Adding ${ hook.name }`);

    this.hooks.push(hook);

    this.log(`Added ${ hook.name }`);
  }

  /**
    reset()
    stops watches from running and removes all watches, hooks, and printers
  */
  reset() {
    this.log("Reseting Activity Watcher");

    /* close each watch */
    this.watches.forEach(watch => {
      this.log(`Closing ${ watch.name }`);
      watch.close();
    });

    /* stop the print loop */
    clearInterval(this.startInterval);

    /* reset all the arrays */
    this.printers = [];
    this.watches = [];
    this.hooks = [];
    this.printQueue = [];

    this.log("Finished Reseting Activity Watcher");
  }
}

exports.ActivityWatcher = ActivityWatcher;
exports.default = ActivityWatcher;
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
/**
  github-watch.js
  Watch that pulls tickets from github
*/

/**
  githubWatch takes in several parameters to build a watch for a given query.

  github: instance of the github api for github.com or an enterprise instance
  e.g. var github = new GithubApi({protocol: "https", host: "api.github.com"});

  query: the search query you want to run against the instance of github.
  This can be the same syntax as the search you would do on the web interface.
  e.g. var query = 'is:open assignee:username'

  startDate: a date object to start loading tickets -- optional
  If a startDate is not provided, the watch will only grab new tickets
  e.g. var startDate = (new Date()).setHours(0,0,0,0) // start of the day
*/
var githubWatch = exports.githubWatch = function (github, query, startDate) {
  return {
    name: `Github Watch: '${ query }'`,

    now: startDate ? startDate : new Date(),

    getTicketObjects: function (printQueue) {
      var now = this.now;

      // make the call, and run the callback when the tickets are recieved
      var apiTickets = github.search.issues({ q: query, sort: 'created' }, function (err, res) {
        if (err) {
          throw err;
        } else {
          // iterate over each ticket, and if they were created after the last
          // check, then add it to the printQueue
          res.items.filter(function (ticket) {
            return new Date(ticket.created_at) > now;
          }).forEach(function (ticket) {
            var project = ticket.url.split("/").slice(-4, -2).join("/");
            printQueue.unshift({
              watch: 'Github Watch',
              title: ticket.title,
              project: project,
              number: ticket.number,
              body: ticket.body
            });
          });
        }
      });

      // update this.now so we only get new tickets
      this.now = new Date();
    }

  };
};

exports.default = githubWatch;
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
/**
  time-watch.js
  Example watch that returns a ticket with the time
*/
var timeWatch = exports.timeWatch = {
  name: "Time Watch",

  // extra variable for incrementing the ticket numbers (not required)
  counter: 0,

  getTicketObjects: function (printQueue) {
    var time = new Date().toLocaleTimeString();
    this.counter += 1;

    // list of tickets to return
    printQueue.unshift({
      watch: "Time Watch",
      title: "TIME-WATCH",
      project: "TIME",
      number: `${ this.counter }`,
      body: `The current time is ${ time }`
    });
  }
};

exports.default = timeWatch;
