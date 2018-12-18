const Json2csvParser  = require("json2csv").Parser;
var exports           = (module.exports = {});
const moltinFunctions = require("./moltin.js");
const fs              = require("fs");
const sshClient       = require("ssh2").Client;

exports.StitchLabsOrderFields = [{
  label: "channel_order_id",
  value: "id"
}, {
  label: "order_date",
  value: "meta.timestamps.created_at"
}, {
  label: "ship_date",
  value: "shipping_date"
}, {
  label: "subtotal",
  value: "subtotal"
}, {
  label: "total",
  value: "price"
}, {
  label: "currency",
  value: "meta.display_price.without_tax.currency"
}, {
  label: "order_status",
  value: "PAID",
  default: "PAID"
}, {
  label: "customer_first_name",
  value: "billing_address.first_name"
}, {
  label: "customer_last_name",
  value: "billing_address.last_name"
}, {
  label: "customer_email",
  value: "customer.email"
}, {
  label: "shipping_address_name",
  value: "customer.name"
}, {
  label: "shipping_address_street_1",
  value: "shipping_address.line_1"
}, {
  label: "shipping_address_street_2",
  value: "shipping_address.line_2"
}, {
  label: "shipping_address_city",
  value: "shipping_address.city"
}, {
  label: "shipping_address_state",
  value: "shipping_address.county"
}, {
  label: "shipping_address_country",
  value: "shipping_address.country"
}, {
  label: "shipping_address_postal_code",
  value: "shipping_address.postcode"
}, {
  label: "shipping_address_phone",
  value: "shipping_address.phone_number"
}, {
  label: "payment_notes",
  value: "transaction_id",
  default: "none"
}, {
  label: "payment_method",
  value: "gateway",
  default: "none"
}, {
  label: "tax",
  value: "tax",
  default: 0
}, {
  label: "discount",
  value: "promotion",
  default: 0
}];

let StitchLabsOrderItemFields = [{
  label: "channel_order_id",
  value: "orderID"
}, {
  label: "channel_listing_id",
  value: "product_id"
}, {
  label: "channel_line_item_id",
  value: "product_id"
}, {
  label: "sku",
  value: "sku"
}, {
  label: "price",
  value: "price"
}, {
  label: "quantity",
  value: "quantity"
}];

// given orders, adds any tax or promotion values for each and returns them
exports.checkOrders = async function(orders) {
  let checkedOrders = [];
  for (const order of orders) {
    let checkedOrder = await checkForTaxOrPromotion(order);
    checkedOrders.push(checkedOrder);
    if (checkedOrders.length === orders.length) {
      console.log("checkOrders is finished");
      return checkedOrders;
    }
  }
};

/* given a single order, looks at its items to check for a negative priced item (promotion)
or an item with a sku of "tax amount" (tax), appends those values to the order under fields "promotion"
and "tax" before returning the order. If it doesn't find any items matching the criteria,
it returns the orders as is*/
const checkForTaxOrPromotion = async function(order) {
  let items      = order.relationships.items;
  let tax        = order.taxes_collected ? +order.taxes_collected : 0;
  order.tax      = order.taxes_collected / 100;
  order.subtotal = (order.meta.display_price.with_tax.amount - tax) / 100;
  for (const item of items) {
    if (Math.sign(item.unit_price.amount) === -1) {
      order.promotion = Math.abs(item.unit_price.amount / 100);
    } else {
    }
  }
  return order;
};

const convert = async function(items, fields, fileName, headers) {
  try {
    // @matt is await necessary here?
    let Parser = await new Json2csvParser({
      fields: fields,
      header: headers
    });
    let csvString = (await Parser.parse(items)) + "\r\n";
    // @matt why are we using await and .then? uploaded is never returned, result is never used, I'm confused
    let uploaded  = await toSFTPFile(csvString, fileName)
      .then((result) => {
        return csvString;
      }).catch((e) => {
        console.log(e);
      })
  } catch (err) {
    console.log(err);
    return err;
  }
};

exports.convertProcess  = async(orders, fields, fileName, headers) => {
  let checkedOrders     = await exports.checkOrders(orders[0]);
  let convertOrders     = await convert(checkedOrders, fields, fileName, headers);
  let convertOrderItems = await convert(
    orders[1],
    StitchLabsOrderItemFields,
    process.env.SFTP_ORDER_ITEMS,
    headers
  );
  console.log("convertProcess is finished");
  return ([convertOrders, convertOrderItems]);
};

const toFile = function(data, fileName) {
  fs.appendFile(fileName, data, function(err) {
    if (err) throw err;
    console.log(fileName, "Saved!");
  });
};

const toSFTPFile = function(content, path) {
  return new Promise(function(resolve, reject) {
    console.log("Upload path for this CSV file is", path);
    let conn = new sshClient();
    conn.on("ready", async() => {
        conn.sftp(async(err, sftp) => {
          if (err) {
            return console.log("Errror in connection", err);
          }
          console.log("Connection established");
          console.log('conent to write is', content);
          let stats = sftp.stat(path, async function(err, stats) {
            if (err) {
              console.log(err);
            }
            if (!stats) {
              console.log("file at path ", path, " is empty");
              let writeStream = sftp.createWriteStream(path);
              console.log("writing data to path ", path);
              writeStream.end(content);
              writeStream.on("close", () => {
                console.log(" - file transferred succesfully to path ", path);
                resolve("- file transferred succesfully to path ", path);
                conn.end();
              });
            } else {
              let writeStream = sftp.createWriteStream(path, {flags:'a'});
              console.log("writing data to path ", path);
              writeStream.end(content);
              writeStream.on("close", async() => {
                console.log(" - file transferred succesfully to path ", path);
                conn.end();
                resolve("toStitchLabsCSV is finished");
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
