module.exports = function(orderId) {
  require("dotenv").config();
  const MoltinGateway = require("@moltin/sdk").gateway;

  const Moltin = MoltinGateway({
    client_id: process.env.MOLTIN_CLIENT_ID,
    client_secret: process.env.MOLTIN_CLIENT_SECRET
  });

  return new Promise((resolve, reject) => {
    Moltin.Orders.Transactions(orderId)
      .then(transactions => {
        resolve(transactions);
      })
      .catch(e => {
        console.log(e);
        reject(e);
      });
  });
};
