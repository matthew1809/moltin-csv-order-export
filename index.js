const toCSV = require("./toCSV");
const moltinFunctions = require("./moltin");

toCSV.readFile("./csv/orders.csv")
  .then(time => {
    moltinFunctions.GetOrders(0, time);
  })
  .catch(e => {
    console.log(e);
});
