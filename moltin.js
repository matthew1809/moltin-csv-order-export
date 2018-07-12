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

exports.formatOrders = function(orders, items) {
  return new Promise(function(resolve, reject) {
    let formattedOrders = [];
    let formattedItems = [];

    orders.data.forEach(function(order) {
      exports.itemsLookup(order, orders.included.items).then(order => {
        formattedOrders.push(order);

        order.relationships.items.forEach(function(item) {
          if (
            item.sku !== "tax_amount" ||
            Math.sign(item.unit_price.amount) === -1
          ) {
            formattedItems.push(item);
          }
        });

        if (formattedOrders.length === orders.data.length) {
          console.log("all orders are finished formatting");
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
          itemsArray.push(item);
        }
      });

      // if there are not order items left to process
      if (itemsProcessed === order.relationships.items.data.length) {
        order.relationships.items = itemsArray;
        resolve(order);
      }
    });
  });
};

// given a timestamp and offset, fetches orders created after that timestamp, and with that offset
exports.GetOrders = function(PageOffsetCounter, time) {
  return new Promise(function(resolve, reject) {
    console.log("we are getting orders created after", time);
    console.log('PageOffsetCounter is', PageOffsetCounter);

    let PageLimit = 100;
    let total = 0;

    Moltin.Orders.Filter({
      eq: { payment: "paid" },
      gt: { created_at: time }
    })
      .Sort("created_at")
      .With("items")
      .Limit(PageLimit)
      .Offset(PageOffsetCounter)
      .All()
      .then(orders => {
        return index.process(orders, PageOffsetCounter, time);
      })
      .catch(e => reject(e));
  });
};
