var exports = (module.exports = {});

var json2csv = require("json2csv").parse;
var moltinFunctions = require("./moltin.js");
var fs = require("fs");

exports.readSFTPFile = readPath => {
  return new Promise((resolve, reject) => {
    console.log("Read path for this CSV file is", readPath);
    let sshClient = require("ssh2").Client;
    let conn      = new sshClient();
    let streamedData, stats;
    conn
      .on("ready", () => {
        conn.sftp(async (err, sftp) => {
          if (err) {
            return console.log("Errror in connection", err);
          }
          console.log("Connection established");
          stats = sftp.stat(readPath, (err, stats) => {
            // if there's nothing, that means we need to get orders from the beginning of time
            if (!stats || stats.size === 0) {
              console.log("file is empty");
              resolve(['2018-08-16T00:00:00.000Z', true]);
            } else {
              let readStream = sftp.createReadStream(readPath);
              readStream.on("data", data => {
                streamedData = streamedData + data;
              });
              readStream.on("end", () => {
                console.log(" - file read successfully");
                var lines     = streamedData.trim().split("\n");
                var lastLine  = lines.slice(-1)[0];
                var fields    = lastLine.split(",");
                var timeField = fields.slice(2)[0];
                timeField     = timeField.replace(/"/g, "");
                resolve([timeField, false]);
                conn.end();
              });
            }
          });
        });
      })
      .connect({
        host: process.env.SFTP_HOST,
        port: process.env.SFTP_PORT,
        username: process.env.SFTP_USERNAME,
        password: process.env.SFTP_PASSWORD
      });
  });
};

exports.checkForDuplicates = function solution(csv) {
  return new Promise(function(resolve, reject) {
    var lines     = csv.split(/\r?\n/g);
    var counts    = {};
    var multiples = {};
    for (var i = 0, ii = lines.length; i < ii; i++) {
      var splt = lines[i].split(/\s*\|\s*/g);
      var val  = splt[0];
      if (!counts[val]) {
        counts[val] = 1;
      } else {
        counts[val]++;
        multiples[val] = counts[val];
      }
    }
    resolve(multiples);
  });
};
