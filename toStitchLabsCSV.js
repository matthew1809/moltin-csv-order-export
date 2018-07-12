const Json2csvParser = require("json2csv").Parser;
var exports = (module.exports = {});
var moltinFunctions = require("./moltin.js");
var fs = require("fs");
var getTransactions = require("./moltin/getTransactions");

exports.StitchLabsOrderFields = [
  { label: "channel_order_id", value: "id" },
  { label: "order_date", value: "meta.timestamps.created_at" },
  { label: "ship_date", value: "meta.timestamps.created_at" },
  { label: "subtotal", value: "price" },
  { label: "total", value: "price" },
  { label: "currency", value: "meta.display_price.without_tax.currency" },
  { label: "order_status", value: "PAID", default: "PAID" },
  { label: "customer_first_name", value: "billing_address.first_name" },
  { label: "customer_last_name", value: "billing_address.last_name" },
  { label: "customer_email", value: "customer.email" },
  { label: "shipping_address_name", value: "customer.name" },
  { label: "shipping_address_street_1", value: "shipping_address.line_1" },
  { label: "shipping_address_street_2", value: "shipping_address.line_2" },
  { label: "shipping_address_city", value: "shipping_address.city" },
  { label: "shipping_address_state", value: "shipping_address.county" },
  { label: "shipping_address_country", value: "shipping_address.country" },
  { label: "shipping_address_postal_code", value: "shipping_address.postcode" },
  { label: "shipping_address_phone", value: "shipping_address.phone_number" },
  { label: "payment_notes", value: "transaction_id", default: "none" },
  { label: "payment_method", value: "gateway", default: "none" },
  { label: "tax", value: "tax", default: 0 },
  { label: "discount", value: "promotion", default: 0 }
];

let StitchLabsOrderItemFields = [
  {
    label: "channel_order_id",
    value: "orderID"
  },
  {
    label: "channel_listing_id",
    value: "product_id"
  },
  {
    label: "channel_line_item_id",
    value: "product_id"
  },
  {
    label: "sku",
    value: "sku"
  },
  {
    label: "price",
    value: "price"
  },
  {
    label: "quantity",
    value: "quantity"
  }
];

const appendTransactionToOrder = order => {
  getTransactions(order.data.id)
    .then(transactions => {
      transactions.data.forEach(transaction => {
        if (
          transaction["transaction-type"] === "purchase" &&
          transaction.status === "complete"
        ) {
          order.data.gateway = transaction.gateway;
          order.data.transaction_id = transaction.reference;
          order.data.price =
            order.data.meta.display_price.without_tax.amount / 100;

          resolve(order);
        } else {
          console.log("no complete transactions found");
        }
      });
    })
    .catch(e => reject(e));
};

// given orders, adds any tax or promotion values for each and returns them
exports.checkOrders = function(orders) {
  return new Promise(function(resolve, reject) {
    let checkedOrders = [];

    orders.forEach(function(order) {
      checkForTaxOrPromotion(order).then(order => {
        checkedOrders.push(order);

        if (checkedOrders.length === orders.length) {
          console.log("all orders are finished formatting");
          resolve(checkedOrders);
        }
      });
    });
  });
};

/* given a single order, looks at its items to check for a negative priced item (promotion)
or an item with a sku of "tax amount" (tax), appends those values to the order under fields "promotion"
and "tax" before returning the order. If it doesn't find any items matching the criteria, 
it returns the orders as is*/
const checkForTaxOrPromotion = function(order) {
  return new Promise(function(resolve, reject) {
    let items = order.relationships.items;

    items.forEach(function(item) {
      if (item.sku === "tax_amount") {
        order.tax = item.unit_price.amount / 100;

        resolve(order);
      } else if (Math.sign(item.unit_price.amount) === -1) {
        order.promotion = item.unit_price.amount / 100;

        resolve(order);
      } else {
        resolve(order);
      }
    });
  });
};

const convert = function(items, fields, fileName, headers) {
  return new Promise(function(resolve, reject) {
    try {
      let Parser = new Json2csvParser({ fields: fields, header: headers });

      let csvString = Parser.parse(items) + "\r\n";

      toFile(csvString, fileName);

      resolve(csvString);
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });
};

exports.convertProcess = (orders, fields, fileName, headers) => {
  return new Promise(function(resolve, reject) {
    exports.checkOrders(orders[0]).then(checkedOrders => {
      convert(checkedOrders, fields, fileName, headers).then(result => {
        convert(
          orders[1],
          StitchLabsOrderItemFields,
          "./csv/line_items.csv",
          headers
        ).then(result => {
          resolve("result");
        });
      });
    });
  });
};

const toFile = function(data, fileName) {
  fs.appendFile(fileName, data, function(err) {
    if (err) throw err;
    console.log(fileName, "Saved!");
  });
};
