/*
 * Module dependencies.
 */

process.env.NODE_CONFIG_DIR = __dirname + "/config/";
config = require("config");
var express = require("express");
var http = require("http");
var https = require("https");
var bodyParser = require("body-parser");
var fs = require("fs");
var cors = require("cors");
var logger = require("morgan");
var multer = require("multer");
var favicon = require("serve-favicon");
var error = require("./routes/error");
var keyUsers = require("./routes/keyUsers");
var walletUsers = require("./routes/walletusers");
var coinData = require("./routes/coindata");
var app = express();

connection = undefined;
require("./routes/mysqlLib");

// all environments
app.set("port", process.env.PORT || config.get("port") || 4013);
app.use(logger("dev"));
app.use(
  bodyParser.urlencoded({
    extended: true
  })
);
app.use(bodyParser.json());
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(cors());

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  next();
});

/////////////////////////////////////////////////////////////
// APIs for HearBeat
/////////////////////////////////////////////////////////////
// API to check if connection is alive or not
app.get("/heartbeat", function(req, res, next) {
  connection.query("SELECT 1 FROM DUAL WHERE 1 = 1", function(err, result) {
    if (err) {
      console.log(err);
      return res.status(500).send("Internal server Error!");
    }
    res.send("Vevsa.com - You save we save!");
  });
});

// For storing data on server

app.get("/", function(req, res) {
  res.send("Coinsafe App  - Never Lose Your Bitcoins Ever!");
});

var storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, __dirname + "/uploads/");
  },
  filename: function(req, file, cb) {
    var fileName = file.originalname.replace(/[|&;$%@"<>()+,' '?]/g, "");
    cb(null, fileName);
  }
});
var upload = multer({ storage: storage });

/**

Testnet Wallet user Apis

**/

app.post("/create_wallet", testUsers.createWallet);
app.post("/show_all_coins", testUsers.showAllCoins);
app.post("/initialise_coin", testUsers.initialiseCoin);

app.post("/transaction_status", testUsers.getTransaction);

app.post("/send_coins", testUsers.sendCoins);

app.post("/receive_coins", testUsers.receiveCoins);

app.post("/estimate_fees", testUsers.estimateFees);

app.post("/login", testUsers.login);

app.post("/fetch_user_asset_data", testUsers.fetchData);

app.post("/add_friends", testUsers.addFriends);

app.post("/get_user_data", testUsers.getUserData);

/**

Wallet user Apis

**/
//
// app.post("/create_wallet", walletUsers.createWallet);
// app.post("/contract_data", walletUsers.contractData);
//
// app.post("/transaction_status", walletUsers.getTransaction);
//
// app.post("/send_coins", walletUsers.sendCoins);
//
// app.post("/receive_coins", walletUsers.receiveCoins);
//
// app.post("/estimate_fees", walletUsers.estimateFees);
//
// app.post("/login", walletUsers.login);
//
// app.post("/add_friends", walletUsers.addFriends);
//
// app.post("/get_user_data", walletUsers.getUserData);

/**

User Private Key Apis

**/

app.get("/fetch_usd_data", coinData.getCoinDataUSD, error);
app.get("/fetch_eth_data", coinData.getCoinDataETH, error);
app.get("/fetch_btc_data", coinData.getCoinDataBTC, error);

app.post("/recovery_key/send_email", keyUsers.sendEmail, error);

app.post("/recovery_key/register_user", keyUsers.registerUser, error);

app.post("/recovery_key/user_trust_data", keyUsers.userTrustData, error);
app.post(
  "/recovery_key/user_change_trust_data",
  keyUsers.userChangeTrustData,
  error
);

app.post(
  "/recovery_key/user_recovery_trust_data",
  keyUsers.sendRecoveryTrustData,
  error
);

app.post("/recovery_key/choose_username", keyUsers.chooseUsername, error);
app.post("/recovery_key/fetch_email_id", keyUsers.fetchEmailId, error);

app.post(
  "/recovery_key/update_recovery_trust_data",
  keyUsers.updateRecoveryTrustData,
  error
);

app.post(
  "/recovery_key/fetch_recovery_trust_data",
  keyUsers.fetchRecoveryTrustData,
  error
);
app.get("/recovery_key/test_database", keyUsers.testDatabase, error);

app.post(
  "/recovery_key/update_recovery_request_status",
  keyUsers.updateRequestRecoveryStatus,
  error
);

app.post(
  "/recovery_key/fetch_recovery_data",
  keyUsers.fetchRecoveryRequests,
  error
);

app.post("/recovery_key/send_otp", keyUsers.sendOtpViaEmail, error);

app.post("/recovery_key/verify_otp", keyUsers.verifyOtpViaEmail, error);

app.post(
  "/recovery_key/fetch_setup_recovery_status",
  keyUsers.fetchSetupRecoveryStatus,
  error
);

app.post(
  "/recovery_key/update_recovery_status_table",
  keyUsers.updateRecoveryStatusTable,
  error
);
app.post(
  "/recovery_key/send_recovery_otp",
  keyUsers.sendRecoveryOtpViaEmail,
  error
);

app.post(
  "/recovery_key/verify_recovery_otp",
  keyUsers.verifyRecoveryOtpViaEmail,
  error
);
app.get("/recovery_key/fetch_user_public_key", keyUsers.searchUser, error);

app.post("/recovery_key/login_user", keyUsers.loginUser, error);

/*
var httpServer = https.createServer(options, app).listen(app.get('port'), function()  {
  console.log('Express server listening on port ' + app.get('port'));
});
*/

var httpServer = http.createServer(app).listen(cred.port, function() {
  console.log("Express server listening on port " + cred.port);
});
