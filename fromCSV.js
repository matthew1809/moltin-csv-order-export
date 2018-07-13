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

exports.readSFTPFile = (readPath) => {
  return new Promise(function(resolve, reject) {

  console.log("Read path for this CSV file is", readPath);

  let sshClient = require("ssh2").Client;

  let conn = new sshClient();

  let data;

  conn
    .on("ready", () => {
      conn.sftp((err, sftp) => {
        if (err) {
          return console.log("Errror in connection", err);
        }

        console.log("Connection established");

        // sftp.readdir('uploads/ORDERS', function(err, list) {
        //     if (err) reject(err);
        //     resolve(list);
        //     conn.end();
        //   });

        let readStream = fs.createReadStream(readPath);

        readStream.on('newData', (data) => {
          data = data + newData;
        });

        readStream.on("end", () => {
          console.log(" - file read successfully");
          resolve(data);
          conn.end();
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
