require("dotenv").config();
const cred = {
  port: 4013,

  dbLiveSettings: {
    host: "134.209.154.3",
    user: process.env.dbuser,
    password: process.env.dbpass,
    database: "coinsafe_testnet",
    connectionLimit: 15
  }
};

module.exports = cred;
