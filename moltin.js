var exports = (module.exports = {});
var toStitchLabsCSV = require("./toStitchLabsCSV");
var toCSV = require("./toCSV");
require("dotenv").config();
const index = require("./index");

// moltin SDK setup
const moltin = require("./js-sdk");

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

exports.formatOrders = async function(orders, items) {
  let formattedOrders = [];
  let formattedItems = [];

  for (const order of orders.data) {
    let orderWithItems = await exports.itemsLookup(
      order,
      orders.included.items
    );

    orderWithItems.price =
      orderWithItems.meta.display_price.with_tax.amount / 100;

    formattedOrders.push(orderWithItems);

    for (const item of orderWithItems.relationships.items) {
      if (
        item.sku !== "tax_amount" &&
        Math.sign(item.unit_price.amount) !== -1
      ) {
        await formattedItems.push(item);
      }
    }

    if (formattedOrders.length === orders.data.length) {
      console.log("formatOrders is finished");

      return [formattedOrders, formattedItems];
    }
  }
};

exports.itemsLookup = async function(order, items) {
  // initialise our counter
  var itemsProcessed = 0;
  let itemsArray = [];

  //for each of the orders related items
  for (const item of order.relationships.items.data) {
    // ID for the orders item
    let id = item.id;
    // increment the counter
    itemsProcessed++;
    // look up each item
    for (const item of items) {
      if (item.id === id) {
        item.orderID = order.id;
        item.price = item.unit_price.amount / 100;
        await itemsArray.push(item);
      }
    }

    // if there are no order items left to process
    if (itemsProcessed === order.relationships.items.data.length) {
      order.relationships.items = itemsArray;

      return order;
    }
  }
};

// given a timestamp and offset, fetches orders created after that timestamp, and with that offset
exports.GetOrders = async function(PageOffsetCounter, time, headers) {
  console.log("PageOffsetCounter is", PageOffsetCounter);

  let formattedTime = time.slice(1, 24);

  let date = time.slice(1, 11);
  let PageLimit = process.env.MOLTIN_PAGE_LIMIT || 50;
  let total = 0;

  console.log("we are getting orders created after", date);

  await Moltin.Orders.Filter({
    eq: { payment: "paid" },
    gt: { created_at: date }
  })
    .Sort("created_at")
    .With("items")
    .Limit(PageLimit)
    .Offset(PageOffsetCounter)
    .All()
    .then(orders => {
      return index.process(orders, PageOffsetCounter, time, headers);
    })
    .catch(e => console.log(e));
};
