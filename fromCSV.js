var exports = (module.exports = {});
var json2csv = require("json2csv").parse;
var moltinData = require("./orders.js");
var moltinFunctions = require("./moltin.js");
var fs = require("fs");

exports.readFile = function(path) {
  return new Promise(function(resolve, reject) {
    // read the file, check if there is anything in it
    const stats = fs.statSync(path);

    // if there's nothing, that means we need to get orders from the beginning of time
    if (stats.size === 0) {
      console.log("file is empty");
      resolve(['"2000-01-01T00:00:00.000Z"', true]);
    }

    // if there are orders in the file, that means we need to get orders after the created_at timestamp of the last order in the file
    else {
      console.log("some orders already in file");

      fs.readFile(path, "utf-8", function(err, data) {
        if (err) reject(err);

        var lines = data.trim().split("\n");
        var lastLine = lines.slice(-1)[0];
        var fields = lastLine.split(",");
        var timeField = fields.slice(2)[0];
        resolve([timeField, false]);
      });
    }
  });
};
