var exports  = (module.exports = {});
var json2csv = require("json2csv").parse;
var fs       = require("fs");

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
    const opts = {
      fields,
      unwind: ["relationships.items"]
    };
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
