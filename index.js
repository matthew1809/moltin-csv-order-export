var exports = (module.exports = {});
const fromCSV = require("./fromCSV");
const moltinFunctions = require("./moltin");
const toCSV = require("./toStitchLabsCSV");
const upload = require("./upload/upload");

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

exports.myHandler = async function(event, context) {
  console.log("running");

  try {
    // reads orders CSV file to see where we should start getting orders from in Moltin
    let finished = await fromCSV
      .readSFTPFile("uploads/ORDERS/orders.csv")
      // now we have a timestamp from whch to begin fetching orders
      .then(result => {
        // go get our orders
        return moltinFunctions.GetOrders(0, result[0], result[1]);
      })
      .catch(e => {
        console.log(e);
      });

    console.log("finished");

    return finished;

  } catch (e) {
    console.log(e);
    return e;
  }
};

// given orders and an offset, processes the orders, updates the offset and asks for the next batch of orders
exports.process = async (orders, PageOffsetCounter, time, headers) => {
  console.log("PageOffsetCounter is", PageOffsetCounter);
  // if there are orders in the results from Moltin
  if (typeof orders.data !== "undefined" && orders.data.length > 0) {
    total = orders.meta.results.total;

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
    var counter = 0;
    let trimmedTime = time.slice(1, 25);

    console.log(
      "Page total is",
      orders.meta.page.total,
      "\nCurrent page is",
      orders.meta.page.current
    );



    // because we only filter by date not time, we need to check that the orders are created after the time of the latest order in the csv
    for (const order of orders.data) {

      if (new Date(order.meta.timestamps.created_at) > new Date(trimmedTime)) {
        
        console.log('moltin order date is',new Date(order.meta.timestamps.created_at),'\nLast order in CSV is', new Date(trimmedTime));
        //await sleep(2000);

        let transactions = await moltinFunctions.getTransactions(order);

        let result = transactions[0];
        let transaction = transactions[1];

        if (result === true && transaction !== undefined) {
          order.gateway = transaction.gateway;
          order.gateway === "manual"
            ? (order.transaction_id = transaction.affirm_charge_id)
            : (order.transaction_id = transaction.reference);
          trimmedOrders.push(order);
        }

        counter++;
      } else {
        console.log("order is older than the last CSV order");
      }

      if (orders.data.length === counter) {
        console.log("all orders processed");
        orders.data = trimmedOrders;

        try {
          // sends orders and their items to be formatted and associated correctly
          let formattedOrders = await moltinFunctions.formatOrders(
            orders,
            orders.included.items
          );

          let result = await toCSV.convertProcess(
            formattedOrders,
            toCSV.StitchLabsOrderFields,
            process.env.SFTP_ORDERS,
            headers
          );
        } catch(e) {
          console.log(e);
        }

        console.log('PageOffsetCounter is', PageOffsetCounter, 'total is', total);

        // if there are still orders in Moltin to fetch
        if (PageOffsetCounter < total) {
    
            console.log("fetching next page of orders, created after", time);
            return await moltinFunctions.GetOrders(PageOffsetCounter, time, false);

        } else {
          return(console.log("fetched all orders"));

          // fs.readFile("./csv/orders.csv", "utf-8", function(err, data) {

          //   if (err) {console.log(err)};

          //   fromCSV.checkForDuplicates(data).then((duplicates) => {
          //     console.log('duplicates are', duplicates);
          //   }).catch((e) => {
          //     console.log(e);
          //   })
          // })
        }
      }
    }
  } else {
    console.log("no results");
  }
};
