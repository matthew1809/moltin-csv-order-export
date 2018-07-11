module.exports = (content, path) => {
  console.log("Upload path for this CSV file is", path);

  let sshClient = require("ssh2").Client;

  let conn = new sshClient();

  conn
    .on("ready", () => {
      conn.sftp((err, sftp) => {
        if (err) {
          return console.log("Errror in connection", err);
        }

        console.log("Connection established");

        let fileAttributes = sftp.stat(path, function(err, stats) {
          if (err) {
            console.log(err);
          }

          let writeStream = sftp.createWriteStream(path);
          console.log("writing data to path ", path);
          writeStream.end(content);

          writeStream.on("close", () => {
            console.log(" - file transferred succesfully to path ", path);
            conn.end();
          });
        });
      });
    })
    .connect({
      host: process.env.STITCHLABS_HOST,
      port: process.env.STITCHLABS_PORT,
      username: process.env.STITCHLABS_USERNAME,
      password: process.env.STITCHLABS_PASSWORD
    });
};
