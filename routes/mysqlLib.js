/*
 * @module mysqlLib
 */
var mysql = require("mysql");
var cred = require("../config/development");

/**
 * Function to handle database connectivity
 */
function handleDisconnectLive() {
  connection = mysql.createPool(cred.dbLiveSettings);

  connection.on("error", function(err) {
    console.log("db error");
    if (err.code == "PROTOCOL_CONNECTION_LOST") {
      handleDisconnectLive();
    } else {
      throw err;
    }
  });
}

handleDisconnectLive();
