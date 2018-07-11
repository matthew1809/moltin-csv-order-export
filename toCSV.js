var exports = (module.exports = {});
var json2csv = require("json2csv").parse;
var moltinData = require("./orders.js");
var moltinFunctions = require("./moltin.js");
var fs = require("fs");

exports.ordersFields = [
  "type",
  "id",
  "meta.timestamps.created_at",
  "status",
  "payment",
  "shipping",
  "customer.name",
  "customer.email",
  "shipping_address.line_1",
  "shipping_address.line_2",
  "shipping_address.city",
  "shipping_address.postcode",
  "shipping_address.county",
  "shipping_address.country",
  "relationships.items.id",
  "relationships.items.name",
  "relationships.items.sku",
  "relationships.items.quantity"
];

exports.convert = function(data, fields, fileName) {
  return new Promise(function(resolve, reject) {
    const opts = { fields, unwind: ["relationships.items"] };

    try {
      var result = json2csv(data, opts);

      toFile(result, fileName);
      resolve(result);
    } catch (err) {
      reject(err);
    }
  });
};

function toFile(data, fileName) {
  fs.appendFile(fileName, data, function(err) {
    if (err) throw err;
    console.log(fileName, "Saved!");
  });
}

exports.readFile = function(path) {
  return new Promise(function(resolve, reject) {
    // read the file, check if there is anything in it
    const stats = fs.statSync(path);

    // if there's nothing, that means we need to get orders from the beginning of time
    if (stats.size === 0) {
      console.log("file is empty");
      resolve("2000-01-01");
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

        console.log(timeField);

        var formattedTimeField = timeField.slice(1, 11);
        resolve(formattedTimeField);
      });
    }
  });
}

