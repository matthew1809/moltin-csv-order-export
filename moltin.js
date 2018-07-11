var exports = (module.exports = {});
var toStitchLabsCSV = require("./toStitchLabsCSV");
var toCSV = require("./toCSV");
require("dotenv").config();

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

exports.GetOrders = function(PageOffsetCounter, time) {
  console.log("this is GetOrders", "we are getting orders created after", time);

  let PageLimit = 100;
  let total = 0;

  Moltin.Orders.Filter({
    //eq: { payment: 'paid' },
    gt: { created_at: time }
  })
    .Sort("created_at")
    .With("items")
    .Limit(PageLimit)
    .Offset(PageOffsetCounter)
    .All()
    .then(orders => {
      if (orders.data) {
        total = orders.meta.results.total;

        PageOffsetCounter = PageOffsetCounter + 100;
        console.log(
          "First retrieved order was created at",
          orders.data[0].meta.timestamps.created_at
        );
        console.log(
          "Page total is",
          orders.meta.page.total,
          "\n Current page is",
          orders.meta.page.current
        );

        exports
          .formatOrders(orders, orders.included.items)
          .then(formattedOrders => {
            toStitchLabsCSV
              .convert(
                formattedOrders,
                toStitchLabsCSV.StitchLabsOrderFields,
                "./csv/orders.csv"
              )
              .then(result => {
                if (PageOffsetCounter < total) {
                  setTimeout(function() {
                    console.log(
                      "fetching next page of orders, created after",
                      time
                    );
                    exports.GetOrders(PageOffsetCounter, time);
                  }, 2000);
                }
              });
          });
      } else {
        console.log("no results");
      }
    })
    .catch(e => {
      console.log(e);
    });
};
