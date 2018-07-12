module.exports = function(order) {
  require("dotenv").config();
  const MoltinGateway = require("@moltin/sdk").gateway;

  const Moltin = MoltinGateway({
    client_id: process.env.CLIENT_ID,
    client_secret: process.env.CLIENT_SECRET
  });

  return new Promise((resolve, reject) => {
    //resolve(order);
    Moltin.Transactions.All({ order: order.id })

      .then(transactions => {

        transactions.data.forEach(function(transaction) {
          if (
            (transaction["transaction-type"] === "purchase" ||
              transaction["transaction-type"] === "capture") &&
            transaction.status === "complete"
          ) {
            resolve([true, { transaction }]);
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
