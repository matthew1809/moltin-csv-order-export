var exports           = (module.exports = {});
const fromCSV         = require("./fromCSV");
const moltinFunctions = require("./moltin");
const toCSV           = require("./toStitchLabsCSV");

exports.myHandler = async function(event, context, callback) {
  console.log("running");
  try {
    // reads orders CSV file to see where we should start getting orders from in Moltin
    let finished = await fromCSV.readSFTPFile(process.env.SFTP_ORDERS)
    let date     = finished[0].substring(0, finished[0].indexOf('T'));
    let orders   = await moltinFunctions.GetOrders(0, date);
    return exports.process(orders, 0, finished[0], date, false);
  } catch (e) {
    console.log(e);
    return e;
  }
};

// given orders and an offset, processes the orders, updates the offset and asks for the next batch of orders
exports.process = async(orders, PageOffsetCounter, time, trimmedTime, headers) => {
  console.log("PageOffsetCounter is", PageOffsetCounter);
  // if there are orders in the results from Moltin
  if (typeof orders.data !== "undefined" && orders.data.length > 0) {
    let total = orders.meta.results.total;
    PageOffsetCounter =
      PageOffsetCounter + parseInt(process.env.MOLTIN_PAGE_LIMIT) || 50;
    console.log("PageOffsetCounter is now", PageOffsetCounter);
    console.log(
      "First retrieved order from moltin was created at",
      orders.data[0].meta.timestamps.created_at,
      "\nThe time of the last order in the csv is",
      time
    );
    let trimmedOrders = [];
    var counter       = 0;
    console.log(
      "Page total is",
      orders.meta.page.total,
      "\nCurrent page is",
      orders.meta.page.current
    );
    // because we only filter by date not time, we need to check that the orders are created after the time of the latest order in the csv
    for (const order of orders.data) {
      console.log('moltin order date is', new Date(order.meta.timestamps.created_at), '\nLast order in CSV is', new Date(time));
      if (new Date(order.meta.timestamps.created_at) > new Date(time)) {
        console.log(order.id, "is new and will be processed");
        let transactions = await moltinFunctions.getTransactions(order);
        let result       = transactions[0];
        let transaction  = transactions[1];
        if (result === true && transaction !== undefined) {
          order.gateway        = transaction.gateway;
          order.transaction_id = order.gateway === "manual" ? transaction.affirm_charge_id : transaction.reference;
          trimmedOrders.push(order);
        }
        counter++;
      } else {
        console.log("order is older than the last CSV order");
        counter++;
      }
      if (orders.data.length === counter) {
        console.log("all orders processed");
        if (trimmedOrders.length > 0) {
          orders.data = trimmedOrders;
          try {
            // sends orders and their items to be formatted and associated correctly
            let formattedOrders = await moltinFunctions.formatOrders(
              orders,
              orders.included.items
            );
            await toCSV.convertProcess(
              formattedOrders,
              toCSV.StitchLabsOrderFields,
              process.env.SFTP_ORDERS,
              headers
            );
          } catch (e) {
            console.log(e);
          }
          console.log('PageOffsetCounter is', PageOffsetCounter, 'total is', total);
          // if there are still orders in Moltin to fetch
          if (PageOffsetCounter < total) {
            console.log("fetching next page of orders, created after", time);
            let date   = time.substring(0, time.indexOf('T'));
            let orders = await moltinFunctions.GetOrders(PageOffsetCounter, date);
            return exports.process(orders, PageOffsetCounter, time, date, false);
          } else {
            return (console.log("fetched all orders"));
          }
        } else {
          console.log("there were no new orders on this page");
          // if there are still orders in Moltin to fetch
          if (PageOffsetCounter < total) {
            console.log("fetching next page of orders, created after", time);
            let date   = time.substring(0, time.indexOf('T'));
            let orders = await moltinFunctions.GetOrders(PageOffsetCounter, trimmedTime);
            return exports.process(orders, PageOffsetCounter, time, date, false);
          } else {
            return (console.log("fetched all orders"));
          }
        }
      }
    }
  } else {
    console.log("no results");
  }
};
