const Json2csvParser = require("json2csv").Parser;
var exports          = (module.exports = {});
require("dotenv").config();
// moltin SDK setup
const moltin = require("@moltin/sdk");

const Moltin = moltin.gateway({
  client_id: process.env.CLIENT_ID,
  client_secret: process.env.CLIENT_SECRET,
  host: process.env.HOST || "api.moltin.com"
});

const processProducts = function() {
  GetProducts(0, []).then(productsArray => {
    convert(productsArray, fields).then(csvString => {
      console.log(csvString);
      toSFTPFile(csvString, "uploads/LISTINGS/listings.csv");
    });
  });
};

const GetProducts = function(PageOffsetCounter, productsArray) {
  return new Promise(function(resolve, reject) {
    console.log("PageOffsetCounter is", PageOffsetCounter);
    Moltin.Products.Sort("created_at")
      .Limit(100)
      .Offset(PageOffsetCounter)
      .All()
      .then(products => {
        PageOffsetCounter = PageOffsetCounter + 100;
        if (PageOffsetCounter < products.meta.results.all) {
          products.data.forEach(function(product) {
            product.price = product.meta.display_price.with_tax.amount / 100;
            productsArray.push(product);
          });
          return GetProducts(PageOffsetCounter, productsArray);
        } else {
          console.log("no more pages left to fetch");
          let productsLeft = products.meta.results.all - (PageOffsetCounter - 100);
          let productsLeftCounter = 0;
          console.log(productsLeft);
          products.data.forEach(function(product) {
            product.price = product.meta.display_price.with_tax.amount / 100;
            productsArray.push(product);
            productsLeftCounter++
          });
          if (productsLeftCounter === productsLeft) {
            console.log("finished processing");
            return Promise.resolve(productsArray);
          }
        }
      })
      .then(products => resolve(products))
      .catch(e => {
        console.log(e);
        reject(e);
      });
  });
};

// Variables
let fields = [{
  label: "channel_listing_id",
  value: "id"
}, {
  label: "sku",
  value: "sku"
}, {
  label: "upc",
  value: "id"
}, {
  label: "price",
  value: "price"
}, {
  label: "name",
  value: "name"
}, {
  label: "description",
  value: "description"
}];

const convert = function(items, fields) {
  return new Promise(function(resolve, reject) {
    try {
      let Parser = new Json2csvParser({
        fields: fields
      });
      let csvString = Parser.parse(items) + "\r\n";
      resolve(csvString);
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });
};

const toSFTPFile = function(content, path) {
  return new Promise(function(resolve, reject) {
    console.log("Upload path for this CSV file is", path);
    let sshClient = require("ssh2").Client;
    let conn      = new sshClient();
    conn
      .on("ready", () => {
        conn.sftp((err, sftp) => {
          if (err) {
            return console.log("Errror in connection", err);
          }
          console.log("Connection established");
          let writeStream = sftp.createWriteStream(path);
          console.log("writing data to path ", path);
          writeStream.end(content);
          writeStream.on("close", () => {
            console.log(" - file transferred succesfully to path ", path);
            resolve("- file transferred succesfully to path ", path);
            conn.end();
          });
          writeStream.on("close", () => {
            console.log(" - file transferred succesfully to path ", path);
            resolve("- file transferred succesfully to path ", path);
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

processProducts();
