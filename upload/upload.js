var exports = (module.exports = {});
const fs = require('fs');

exports.upload = (readPath, writePath) => {
  console.log("Upload path for this CSV file is", writePath);

  let sshClient = require("ssh2").Client;

  let conn = new sshClient();

  conn
    .on("ready", () => {
      conn.sftp((err, sftp) => {
        if (err) {
          return console.log("Errror in connection", err);
        }

        console.log("Connection established");

          if (err) {
            console.log(err);
          }
          let readStream = fs.createReadStream(readPath)
          let writeStream = sftp.createWriteStream(writePath);

          console.log("writing data to path ", writePath);
          readStream.pipe(writeStream);

          writeStream.on("close", () => {
            console.log(" - file transferred succesfully to path ", writePath);
            conn.end();
          });
        });

    })
    .connect({
      host: process.env.UPLOAD_HOST,
      port: process.env.UPLOAD_PORT,
      username: process.env.UPLOAD_USERNAME,
      password: process.env.UPLOAD_PASSWORD
    });
};
