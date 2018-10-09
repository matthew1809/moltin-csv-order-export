var access_token;
var exports         = (module.exports = {});
var qs              = require("querystring");
var toStitchLabsCSV = require("./toStitchLabsCSV");
var http            = require("https");
var toCSV           = require("./toCSV");
const index         = require("./index");
require("dotenv").config();

function auth() {
  return new Promise((resolve, reject) => {
    var req = http.request({
      "method": "POST",
      "hostname": "api.moltin.com",
      "path": "/oauth/access_token",
      "headers": {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
      }
    }, (res) => {
      var chunks = [];
      res.on("data", (chunk) => {
        chunks.push(chunk);
      });
      res.on("end", () => {
        var body = Buffer.concat(chunks);
        body = body.toString();
        resolve(body)
      });
    });
    req.write(qs.stringify({
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
      grant_type: 'client_credentials'
    }));
    return req.end();
  });
}

async function get(url) {
  let res      = await auth();
  access_token = JSON.parse(res).access_token;
  return new Promise((resolve, reject) => {
    var request = http.request({
        "method": "GET",
        "hostname": "api.moltin.com",
        "path": url,
        "headers": {
          "Accept": "application/json",
          "Authorization": "Bearer " + access_token,
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
        }
      },
      (res) => {
        res.setEncoding('utf8');
        if (res.statusCode >= 400) {
          return reject(res.statusMessage);
        }
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          if (typeof data === 'string') {
            data = JSON.parse(data);
          }
          resolve(data);
        });
      }
    );
    request.on('error', (e) => {
      console.log(e)
      reject(e);
    });
    return request.end();
  });
}

exports.getTransactions = function(order) {
  return new Promise((resolve, reject) => {
    get('/v2/orders/' + order.id + '/transactions')
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
    // for now we are only whitelisting digits, letters white space and https://stackoverflow.com/a/4374890/1971272
    orderWithItems.price                   = orderWithItems.meta.display_price.with_tax.amount / 100;
    orderWithItems.shipping_address.line_1 = orderWithItems.shipping_address.line_1.replace(/[^\w\s\-]/gi, '');
    orderWithItems.shipping_address.line_2 = orderWithItems.shipping_address.line_2.replace(/[^\w\s\-]/gi, '');
    orderWithItems.shipping_address.city   = orderWithItems.shipping_address.city.replace(/[^\w\s\-]/gi, '');
    orderWithItems.customer.name           = orderWithItems.customer.name.replace(/[^\w\s\-]/gi, '');

    formattedOrders.push(orderWithItems);
    for (const item of orderWithItems.relationships.items) {
      if (
        item.sku !== "tax_amount" &&
        Math.sign(item.unit_price.amount) !== -1
      ) {
        // @matt why is await being used here?
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
  let itemsArray     = [];
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
        itemsArray.push(item);
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
exports.GetOrders = async function(PageOffsetCounter, date) {
  return new Promise((resolve, reject) => {
    console.log("PageOffsetCounter is", PageOffsetCounter);
    let PageLimit = process.env.MOLTIN_PAGE_LIMIT || 50;
    let total     = 0;
    console.log("we are getting orders created after", date);
    get(`/v2/orders?filter=eq(payment,paid):gt(created_at,${date})&sort=created_at&include=items&page[limit]=${PageLimit}&page[offset]=${PageOffsetCounter}`)
      .then(resolve)
      .catch(reject);
  });
};
