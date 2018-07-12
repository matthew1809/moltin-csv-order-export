module.exports = function(order) {
  require("dotenv").config();
  const MoltinGateway = require("@moltin/sdk").gateway;

  const Moltin = MoltinGateway({
    client_id: process.env.CLIENT_ID,
    client_secret: process.env.CLIENT_SECRET
  });

  return new Promise((resolve, reject) => {
    resolve(order);
//     Moltin.Orders.Transactions(order.id)

//       .then(transactions => {
//         transactions.data.forEach(function(transaction) {
//           if (
//             transaction["transaction-type"] === "purchase" &&
//             transaction.status === "complete"
//           ) {
//             order.gateway = transaction.gateway;
//             order.transaction_id = transaction.reference;
//             resolve(order);
//           }
//         });
//       })
//       .catch(e => {
//         console.log(e);
//         reject(e);
//       });
   });
 };
