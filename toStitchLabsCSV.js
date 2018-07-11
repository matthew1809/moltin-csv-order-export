const Json2csvParser = require("json2csv").Parser;
var exports = (module.exports = {});
var moltinFunctions = require("./moltin.js");
var fs = require("fs");

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

// takes in all orders, loops through orders, sends each one for formatting
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

// takes in an order, loops through items and appends to the order, returns the order
var checkForTaxOrPromotion = function(order) {
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

var convertLineItems = function(items, fields, fileName) {
  return new Promise(function(resolve, reject) {
    try {
      let Parser = new Json2csvParser({ fields: fields });

      let csvString = Parser.parse(items);

      toFile(csvString, fileName);
      resolve("result");
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });
};

exports.convert = (orders, fields, fileName) => {
  return new Promise(function(resolve, reject) {
    exports.checkOrders(orders[0]).then(checkedOrders => {
      try {
        let Parser = new Json2csvParser({ fields: fields });

        let csvString = Parser.parse(checkedOrders);

        toFile(csvString, fileName);

        convertLineItems(
          orders[1],
          StitchLabsOrderItemFields,
          "./csv/line_items.csv"
        ).then(result => {
          resolve("result");
        });
      } catch (err) {
        console.log(err);
        reject(err);
      }
    });
  });

  //   require('../../transactions')
  //     .getTransaction(order.data.id)
  //     .then((transactions) => {
  //       transactions.data.forEach((transaction) => {
  //         console.log(transaction['transaction-type'], transaction.status);
  //         if (transaction['transaction-type'] === 'purchase' && transaction.status === 'complete') {

  //           order.data.gateway = transaction.gateway;
  //           order.data.transaction_id = transaction.reference;
  //           order.data.price = order.data.meta.display_price.without_tax.amount / 100;

  //           let Parser = new Json2csvParser({fields: fields, header: headers});

  //           let csvString = Parser.parse(order.data);

  //           return resolve({order: csvString, items: items});
  //         } else {
  //           console.log('no complete transactions found');
  //         }
  //       });
  //     })
  //     .catch((e) => reject(e));
  // });
};

const toFile = function(data, fileName) {
  fs.appendFile(fileName, data, function(err) {
    if (err) throw err;
    console.log(fileName, "Saved!");
  });
};
