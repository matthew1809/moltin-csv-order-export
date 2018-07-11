const fromCSV = require("./fromCSV");
const moltinFunctions = require("./moltin");

// reads orders CSV file to see where we should start getting orders from in Moltin

fromCSV
  .readFile("./csv/orders.csv")
  .then(time => {
    moltinFunctions.GetOrders(0, time);
  })
  .catch(e => {
    console.log(e);
  });
