var exports = (module.exports = {});
const fromCSV = require("./fromCSV");
const moltinFunctions = require("./moltin");
const toCSV = require("./toStitchLabsCSV");
const upload = require('./upload/upload');
  // reads orders CSV file to see where we should start getting orders from in Moltin
fromCSV
.readFile("./csv/orders.csv")
// now we have a timestamp from whch to begin fetching orders
.then(time => {
// go get our orders
moltinFunctions.GetOrders(0, time)
})
.catch(e => {
console.log(e);
});


// given orders and an offset, processes the orders, updates the offset and asks for the next batch of orders
exports.process = (orders, PageOffsetCounter, time) => {
  
  console.log('PageOffsetCounter is', PageOffsetCounter);
  // if there are orders in the results from Moltin
  if (orders.data) {
    total = orders.meta.results.total;

    PageOffsetCounter = PageOffsetCounter + 100;

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
    let counter = 0;
    // because we only filter by date not time, we need to check that the orders are created after the time of the latest order in the csv
     orders.data.forEach(function(order) {

     	counter++;

     	let trimmedTime = time.slice(1, 24)

     	if(order.meta.timestamps.created_at > trimmedTime) {
     	  trimmedOrders.push(order);
     	};

     	if(orders.data.length === counter) {
     		console.log('running');
     		orders.data = trimmedOrders;

	      moltinFunctions
	      // sends orders and their items to be formatted and associated correctly
	      .formatOrders(orders, orders.included.items)
	      .then(formattedOrders => {
	        toCSV
	          .convertProcess(
	            formattedOrders,
	            toCSV.StitchLabsOrderFields,
	            "./csv/orders.csv"
	          )
	          .then(result => {
	          	console.log(PageOffsetCounter, total
	          		);
	            // if there are still orders in Moltin to fetch
	            if (PageOffsetCounter < total) {
	              setTimeout(function() {
	                console.log(
	                  "fetching next page of orders, created after",
	                  time
	                );
	                moltinFunctions.GetOrders(PageOffsetCounter, time);
	              }, 2000);
	            } else {
	            	console.log('fetched all orders, uploading now');
	            	//upload.upload('./csv/line_items.csv', './uploads/ORDERS/test_line_items.csv');
	    			//upload.upload('./csv/orders.csv', './uploads/ORDERS/test_orders.csv');
	            }
	          });
	      });


     	}
     });

  } else {
    console.log("no results");
  }
};
