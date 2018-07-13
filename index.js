var exports = (module.exports = {});
const fromCSV = require("./fromCSV");
const moltinFunctions = require("./moltin");
const toCSV = require("./toStitchLabsCSV");
const upload = require("./upload/upload");

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// reads orders CSV file to see where we should start getting orders from in Moltin
fromCSV
  .readSFTPFile("uploads/ORDERS/orders.csv")
  // now we have a timestamp from whch to begin fetching orders
  .then(result => {

    // go get our orders
    moltinFunctions.GetOrders(0, result[0], result[1]);
  })
  .catch(e => {
    console.log(e);
  });

// given orders and an offset, processes the orders, updates the offset and asks for the next batch of orders
exports.process = async (orders, PageOffsetCounter, time, headers) => {
  console.log("PageOffsetCounter is", PageOffsetCounter);
  // if there are orders in the results from Moltin
  if (orders.data) {
    total = orders.meta.results.total;

    PageOffsetCounter = PageOffsetCounter + process.env.MOLTIN_PAGE_LIMIT || 50;

    console.log(
      "First retrieved order from moltin was created at",
      orders.data[0].meta.timestamps.created_at,
      "\nThe time of the last order in the csv is",
      time
    );

    console.log(
      "Page total is",
      orders.meta.page.total,
      "\nCurrent page is",
      orders.meta.page.current
    );

    let trimmedOrders = [];
    var counter = 0;

    // because we only filter by date not time, we need to check that the orders are created after the time of the latest order in the csv
    await orders.data.forEach(async function(order, index) {
      await sleep(1000 * index);
      let trimmedTime = time.slice(1, 24);

      var transactions = await moltinFunctions.getTransactions(order);

      if (new Date(order.meta.timestamps.created_at) > new Date(trimmedTime)) {
        let result = transactions[0];
        let transaction = transactions[1];

        if (result === true && transaction !== undefined) {
          order.gateway = transaction.gateway;
          order.gateway === "manual"
            ? (order.transaction_id = transaction.affirm_charge_id)
            : (order.transaction_id = transaction.reference);
          trimmedOrders.push(order);
        }
      }

      counter++;

      console.log(counter);
      console.log(orders.data.length);

      if (orders.data.length === counter) {
        console.log("all orders processed");
        orders.data = trimmedOrders;

        moltinFunctions
          // sends orders and their items to be formatted and associated correctly
          .formatOrders(orders, orders.included.items)
          .then(formattedOrders => {
            toCSV
              .convertProcess(
                formattedOrders,
                toCSV.StitchLabsOrderFields,
                process.env.SFTP_ORDERS,
                headers
              )
              .then(result => {
                console.log(PageOffsetCounter, total);
                // if there are still orders in Moltin to fetch
                if (PageOffsetCounter < total) {
                  setTimeout(function() {
                    console.log(
                      "fetching next page of orders, created after",
                      time
                    );
                    moltinFunctions.GetOrders(PageOffsetCounter, time, false);
                  }, 2000);
                } else {
                  console.log("fetched all orders, uploading now");
                  // upload.upload(
                  //   "./csv/line_items.csv",
                  //   "./uploads/ORDERS/line_items.csv"
                  // );
                  // upload.upload(
                  //   "./csv/orders.csv",
                  //   "./uploads/ORDERS/orders.csv"
                  // );


                  // fs.readFile("./csv/orders.csv", "utf-8", function(err, data) {

                  //   if (err) {console.log(err)};

                  //   fromCSV.checkForDuplicated(data).then((duplicates) => {
                  //     console.log('duplicates are', duplicates);
                  //   }).catch((e) => {
                  //     console.log(e);
                  //   })
                  // })

                }
              });
          });
      }
    });
  } else {
    console.log("no results");
  }
};
