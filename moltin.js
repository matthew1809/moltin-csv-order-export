var exports = (module.exports = {});
var toStitchLabsCSV = require("./toStitchLabsCSV");
var toCSV = require("./toCSV");
require("dotenv").config();
const index = require("./index");

// moltin SDK setup
const moltin = require("@moltin/sdk");

const Moltin = moltin.gateway({
  client_id: process.env.CLIENT_ID,
  client_secret: process.env.CLIENT_SECRET,
  host: process.env.HOST || "api.moltin.com"
});

let LastPageOffset = 0;

exports.getTransactions = function(order) {
   
    return new Promise((resolve, reject) => {
      //resolve(order);
      Moltin.Transactions.All({ order: order.id })

        .then(transactions => {

          transactions.data.forEach(function(transaction) {
            if (
              (transaction["transaction-type"] === "purchase" ||
                transaction["transaction-type"] === "capture") &&
              transaction.status === "complete"
            ) {
              resolve([true, transaction]);
            } else {
              resolve([false, undefined]);
            }
          });
        })
        .catch(e => {
          console.log(e);
          reject(e);
        });
    });
};


exports.formatOrders = function(orders, items) {
  return new Promise(function(resolve, reject) {
    let formattedOrders = [];
    let formattedItems = [];

    orders.data.forEach(function(order, index) {
      exports.itemsLookup(order, orders.included.items).then(order => {
        order.price = order.meta.display_price.with_tax.amount / 100;

        formattedOrders.push(order);

        order.relationships.items.forEach(function(item) {
          if (
            item.sku !== "tax_amount" &&
            Math.sign(item.unit_price.amount) !== -1
          ) {
            formattedItems.push(item);
          }
        });

        if (formattedOrders.length === orders.data.length) {
          resolve([formattedOrders, formattedItems]);
        }
      });
    });
  });
};

exports.itemsLookup = function(order, items) {
  return new Promise(function(resolve, reject) {
    // initialise our counter
    var itemsProcessed = 0;
    let itemsArray = [];

    //for each of the orders related items
    order.relationships.items.data.forEach(function(item) {
      // ID for the orders item
      let id = item.id;
      // increment the counter
      itemsProcessed++;
      // look up each item
      items.forEach(function(item) {
        if (item.id === id) {
          item.orderID = order.id;
          item.price = item.unit_price.amount / 100;
          itemsArray.push(item);
        }
      });

      // if there are no order items left to process
      if (itemsProcessed === order.relationships.items.data.length) {
        order.relationships.items = itemsArray;
        resolve(order);
      }
    });
  });
};

// given a timestamp and offset, fetches orders created after that timestamp, and with that offset
exports.GetOrders = function(PageOffsetCounter, time, headers) {
  console.log("PageOffsetCounter is", PageOffsetCounter);

  let formattedTime = time.slice(1, 24);

  let date = time.slice(1, 11);
  let PageLimit = process.env.MOLTIN_PAGE_LIMIT || 50;
  let total = 0;

  console.log("we are getting orders created after", date);

  Moltin.Orders.Filter({
    eq: { payment: "paid" },
    gt: { created_at: date }
  })
    .Sort("created_at")
    .With("items")
    .Limit(PageLimit)
    .Offset(PageOffsetCounter)
    .All()
    .then(orders => {
      index.process(orders, PageOffsetCounter, time, headers);
    })
    .catch(e => console.log(e));
};
