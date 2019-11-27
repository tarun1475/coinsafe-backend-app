require("dotenv").config();

var express = require("express");
var uniqueid = require("shortid");
const axios = require("axios");
var constants = require("./constants");

var utils = require("./commonfunctions.js");
var blockchain = require("blockchain.info");
var async = require("async");
var Web3 = require("web3");
var web3 = new Web3(
  "https://mainnet.infura.io/v3/d3fed111149540e2b7b29e20c3d21fd8"
);

const daiContractAddress = "0x89d24a6b4ccb1b6faa2625fe562bdd9a23260359";
var bitcore = require("bitcore-lib");
var Unit = bitcore.Unit;

var blockexplorer = require("blockchain.info/blockexplorer").usingNetwork(0);
var pushtx = require("blockchain.info/pushtx").usingNetwork(0);

const rp = require("request-promise");

const TOKEN_API = "4RIKGRFRF4BIBZUYYVXU2MV999EARX8E4W";
var api = require("etherscan-api").init(TOKEN_API);

var shortid = require("shortid");
const daiAbi = require("./daiAbi");

exports.createWallet = createWallet;
exports.contractData = contractData;
exports.sendCoins = sendCoins;
exports.receiveCoins = receiveCoins;
exports.estimateFees = estimateFees;
exports.getTransaction = getTransaction;
exports.login = login;
exports.addFriends = addFriends;
exports.getUserData = getUserData;

function contractData(req, res) {
  let address = req.body.address;
  let toAddress = req.body.toAddress;
  let amount = req.body.amount;
  let asset_id = req.body.asset_id;

  const contract = new web3.eth.Contract(daiAbi, address);

  const data = contract.methods.transfer(toAddress, amount).encodeABI();

  res.send({
    log: "Data Fetched Successfully",
    contractData: data,
    flag: constants.responseFlags.ACTION_COMPLETE
  });
}

// index_walletinfo
// index_personalinfo

function getUserData(req, res) {
  var addresses = [];
  let btcAddresses = [];

  let btcAddressArr = req.body.btcAddressArr;
  let ethAddress = req.body.ethAddress;

  for (var i = 0; i < btcAddressArr.length; i++) {
    btcAddresses.push(btcAddressArr[i].address);
  }

  var resultArr = [];

  function fetchAssetData(callback) {
    var Query = "SELECT * from tb_assets";

    var tt = connection.query(Query, function(err, result) {
      if (err) {
        return res.send({
          log: "Internal server error",
          flag: constants.responseFlags.ACTION_FAILED,
          Error: err
        });
      }

      callback(null, result);
    });
  }

  function fetchBalanceData(callback) {
    var balanceArr = [];
    var balances = [];

    function fetchBtcData(callback) {
      let transactions = [];
      blockexplorer
        .getMultiAddress(btcAddresses, {})
        .then(result => {
          callback(
            null,
            Unit.fromSatoshis(result.wallet.final_balance).to(Unit.BTC)
          );
        })
        .catch(function(err) {
          callback(err, null);
        });
    }

    function fetchEthData(callback) {
      var ethBalance = api.account.balance(ethAddress);
      ethBalance
        .then(function(result) {
          callback(null, result.result);
        })
        .catch(function(error) {
          return res.send({
            log: "Internal server error",
            flag: constants.responseFlags.ACTION_FAILED,
            error: error.message
          });
        });
    }

    function fetchDaiData(callback) {
      const account = ethAddress;
      const contractAddress = "0x89d24a6b4ccb1b6faa2625fe562bdd9a23260359";

      var tokenBalance = api.account.tokenbalance(
        account,
        "",
        contractAddress // DAI contract address
      );

      tokenBalance
        .then(function(result) {
          callback(null, result.result);
        })
        .catch(function(error) {
          return res.send({
            log: "Internal server error",
            flag: constants.responseFlags.ACTION_FAILED,
            error: error.message
          });
        });
    }

    balanceArr.push(fetchBtcData, fetchEthData, fetchDaiData);
    // balanceArr.push(fetchBtcData)

    async.parallel(balanceArr, function(newErr, newRes) {
      var btc = newRes[0];
      var eth = newRes[1] / 1000000000000000000;
      var dai = newRes[2] / 1000000000000000000;
      balances.push(btc);
      balances.push(eth);
      balances.push(0);
      balances.push(0);
      balances.push(dai);
      // balances.push('')
      callback(null, balances);
    });
  }

  resultArr.push(fetchBalanceData, fetchAssetData);
  async.parallel(resultArr, function(newErr, newRes) {
    var balance = newRes[0];

    var assetData = newRes[1];

    var final_data = [];

    for (var j = 0; j < 5; j++) {
      let finalDataObj = {};
      finalDataObj.asset_id = assetData[j].asset_id;
      finalDataObj.asset_symbol = assetData[j].asset_symbol;
      finalDataObj.asset_icon_light = assetData[j].asset_icon_light;
      finalDataObj.asset_icon_dark = assetData[j].asset_icon_dark;
      finalDataObj.asset_value = assetData[j].asset_value_usd;
      finalDataObj.asset_name = assetData[j].asset_name;
      finalDataObj.asset_address = addresses[j];
      finalDataObj.asset_balance = balance[j];

      final_data.push(finalDataObj);
    }

    res.send({
      log: "Data Fetched Successfully",
      assetData: final_data,
      flag: constants.responseFlags.ACTION_COMPLETE
    });
  });
}

function addFriends(req, res) {
  var handlerInfo = {
    apiModule: "users",
    apiHandler: "add friends"
  };

  var public_key_hash = req.body.public_key_hash;
  var status = req.body.status;

  if (utils.checkBlank([public_key_hash, status])) {
    return res.send(constants.parameterMissingResponse);
  }

  sqlQuery = "SELECT * FROM tb_users where public_key_hash = ?";

  var tt = connection.query(sqlQuery, [public_key_hash], function(err, data) {
    if (err) {
      return res.send({
        log: "Internal server error",
        flag: constants.responseFlags.ACTION_FAILED,
        Error: err
      });
    }
    if (data.length == 0) {
      res.send({
        log: "User Does Not Exist",
        flag: constants.responseFlags.ACTION_FAILED
      });
    } else {
      res.send({
        log: "Added",
        flag: constants.responseFlags.ACTION_COMPLETE,
        result: data
      });
    }
  });
}

function createWallet(req, res) {
  var handlerInfo = {
    apiModule: "users",
    apiHandler: "signUpUser"
  };

  var private_key_hash = req.body.private_key_hash;
  var public_key_hash = req.body.public_key_hash;
  var wallet_id = uniqueid.generate();

  if (utils.checkBlank([private_key_hash, public_key_hash, wallet_id])) {
    return res.send(constants.parameterMissingResponse);
  }

  var sqlQuery =
    "INSERT INTO tb_users (wallet_id,public_key_hash, private_key_hash, logged_on) VALUES(?, ?,?, NOW())";
  var tt = connection.query(
    sqlQuery,
    [wallet_id, public_key_hash, private_key_hash],
    function(err, result) {
      if (err) {
        if (err.errno === 1062) {
          return res.send({
            log: "User Already Exists",
            flag: constants.responseFlags.ACTION_FAILED
          });
        }

        return res.send({
          log: "Internal server error",
          flag: constants.responseFlags.ACTION_FAILED
        });
      }

      res.send({
        log: "User Registered successfully",
        flag: constants.responseFlags.ACTION_COMPLETE,
        wallet_id: wallet_id
      });
    }
  );
}

// dependng on asset id this functionality is defined
function getTransaction(req, res) {
  var handlerInfo = {
    apiModule: "users",
    apiHandler: "getTransaction"
  };

  var asset_id = req.body.asset_id || 1; // 2 for eth 1 for btc
  var transaction_id = req.body.transaction_id;

  if (utils.checkBlank([transaction_id])) {
    return res.send(constants.parameterMissingResponse);
  }

  if (asset_id == 2) {
    var transaction = api.proxy.eth_getTransactionReceipt(transaction_id);
    transaction
      .then(function(transaction) {
        res.send({
          result: transaction.result,
          flag: constants.responseFlags.ACTION_COMPLETE
        });
      })
      .catch(error => {
        res.send({
          log: "Internal server error",
          flag: constants.responseFlags.ACTION_FAILED,
          error: error
        });
      });
  } else {
    var options = {
      uri: "https://chain.so/api/v2/get_tx/BTC/" + transaction_id,
      headers: {
        "User-Agent": "Request-Promise"
      },
      json: true // Automatically parses the JSON string in the response
    };

    rp(options)
      .then(function(result) {
        var transaction = {};
        var details = [];

        var detailsObj = {};
        detailsObj.amount = parseFloat(result.data.outputs[0].value);

        details.push(detailsObj);

        transaction.details = details;
        transaction.confirmations = result.data.confirmations;

        res.send({
          result: transaction,
          flag: constants.responseFlags.ACTION_COMPLETE
        });
      })
      .catch(function(err) {
        res.send({
          result: transaction,
          flag: constants.responseFlags.ACTION_FAILED
        });
      });
  }
}

function estimateFees(req, res) {
  var asset_id = req.body.asset_id || 1;
  var address = req.body.address || "";

  if (asset_id == 2) {
    var resultArr = [];

    function fetchEtherPrice(callback) {
      var Query = "SELECT * from tb_assets WHERE asset_id = 5";
      var tt = connection.query(Query, function(err, data) {
        if (err) {
          return res.send({
            log: "Internal server error",
            flag: constants.responseFlags.ACTION_FAILED,
            Error: err
          });
        }
        callback(null, data[0].asset_value_eth);
      });
    }

    function getGasPrice(callback) {
      var options = {
        method: "GET",
        uri: "https://api.blockcypher.com/v1/eth/main",
        headers: {
          "User-Agent": "Request-Promise"
        },
        json: true // Automatically parses the JSON string in the response
      };

      rp(options)
        .then(result => {
          let feeObj = {};
          let lowFee = result.low_gas_price;
          let mediumFee = result.medium_gas_price;
          let highFee = result.high_gas_price;

          feeObj.lowFee = lowFee;
          feeObj.mediumFee = mediumFee;
          feeObj.highFee = highFee;

          callback(null, feeObj);
        })
        .catch(err => {
          return res.send({
            log: "Internal server error",
            flag: constants.responseFlags.ACTION_FAILED,
            error: error.message
          });
          // API call failed...
        });
    }

    function getNonce(callback) {
      var nounce = api.proxy.eth_getTransactionCount(address, "latest");
      nounce
        .then(result => {
          callback(null, parseInt(result.result));
        })
        .catch(error => {
          return res.send({
            log: "Internal server error",
            flag: constants.responseFlags.ACTION_FAILED,
            error: error.message
          });
        });
    }

    resultArr.push(getGasPrice, getNonce, fetchEtherPrice);

    async.parallel(resultArr, function(newErr, newRes) {
      var gasPrice = newRes[0];
      var Nonce = newRes[1];
      let etherValue = newRes[2];

      return res.send({
        log: "Data Fetched Successfully",
        gasPrice: gasPrice,
        Nonce: Nonce,
        etherValue: etherValue,
        flag: constants.responseFlags.ACTION_COMPLETE
      });
    });
  } else {
    var options = {
      method: "GET",
      uri: "http://api.blockcypher.com/v1/btc/main",
      headers: {
        "User-Agent": "Request-Promise"
      },
      json: true // Automatically parses the JSON string in the response
    };

    rp(options)
      .then(result => {
        let feeObj = {};
        let lowFee = (result.low_fee_per_kb / 1024).toFixed(2);
        let mediumFee = (result.medium_fee_per_kb / 1024).toFixed(2);
        let highFee = (result.high_fee_per_kb / 1024).toFixed(2);

        feeObj.lowFee = lowFee;
        feeObj.mediumFee = mediumFee;
        feeObj.highFee = highFee;

        res.send({
          log: "Sent Successfully",
          fee: feeObj,
          flag: constants.responseFlags.ACTION_COMPLETE
        });
      })
      .catch(err => {
        res.send({
          log: "Error in send transaction",
          error: err,
          flag: constants.responseFlags.ACTION_FAILED
        });
        // API call failed...
      });
  }
}

/*
 * coin dependent function, depends on asset id
 * this api creates public key, private key and address of that particular coin
 *
 * needs to import address
 */

function sendCoins(req, res) {
  var handlerInfo = {
    apiModule: "users",
    apiHandler: "createKeys"
  };

  var asset_id = req.body.asset_id || 1;
  var transaction_hash = req.body.transaction_hash;

  if (utils.checkBlank([transaction_hash])) {
    return res.send(constants.parameterMissingResponse);
  }

  if (asset_id === 2) {
    var result = api.proxy.eth_sendRawTransaction(transaction_hash);
    result
      .then(function(tx) {
        console.log("txid: " + JSON.stringify(tx));
        res.send({
          log: "Data fetched successfully",
          result: tx.result,
          flag: constants.responseFlags.ACTION_COMPLETE
        });
      })
      .catch(function(error) {
        res.send({
          log: "Internal server error",
          flag: constants.responseFlags.ACTION_FAILED,
          error: error
        });
      });
  } else {
    var options = {
      method: "POST",
      uri: "https://chain.so/api/v2/send_tx/BTC",
      body: {
        tx_hex: transaction_hash
      },
      headers: {
        "User-Agent": "Request-Promise"
      },
      json: true // Automatically parses the JSON string in the response
    };

    rp(options)
      .then(function(result) {
        res.send({
          log: "Sent Successfully",
          result: result.data.txid,
          flag: constants.responseFlags.ACTION_COMPLETE
        });
      })
      .catch(function(err) {
        res.send({
          log: "Error in send transaction",
          error: err,
          flag: constants.responseFlags.ACTION_FAILED
        });
        // API call failed...
      });
  }
}

/*
 * coin dependent function, depends on asset id
 * this api creates public key, private key and address of that particular coin
 *
 * needs to import address
 */

function receiveCoins(req, res) {
  var handlerInfo = {
    apiModule: "users",
    apiHandler: "createKeys"
  };

  var addresses = [];
  addresses = req.body.addresses;

  var asset_id = req.body.asset_id || 1;

  if (asset_id == 2) {
    var resultArr = [];

    function balanceDetails(callback) {
      var balance = api.account.balance(addresses[0].address);
      balance
        .then(function(result) {
          callback(null, result);
        })
        .catch(function(error) {
          return res.send({
            log: "Internal server error",
            flag: constants.responseFlags.ACTION_FAILED,
            error: error.message
          });
        });
    }

    function transactionHistory(callback) {
      var txlist = api.account.txlist(addresses[0].address);
      txlist
        .then(function(Data) {
          callback(null, Data);
        })
        .catch(function(error) {
          var txlist = [];
          if (error == "NOTOK") callback(null, txlist);
        });
    }

    resultArr.push(balanceDetails, transactionHistory);

    async.parallel(resultArr, function(newErr, newRes) {
      var balance = {};
      balance.balance = newRes[0].result;
      if (newRes[1].length == 0) var txHistory = newRes[1];
      else var txHistory = newRes[1].result;

      return res.send({
        log: "Data Fetched Successfully",
        transactions: txHistory,
        balanceHistory: balance,
        flag: constants.responseFlags.ACTION_COMPLETE
      });
    });
  } else if (asset_id == 5) {
    var resultArr = [];

    function balanceDetails(callback) {
      const account = addresses[0].address;
      const contractAddress = "0x89d24a6b4ccb1b6faa2625fe562bdd9a23260359";

      var tokenBalance = api.account.tokenbalance(
        account,
        "",
        contractAddress // DAI contract address
      );

      tokenBalance
        .then(function(result) {
          callback(null, result);
        })
        .catch(function(error) {
          return res.send({
            log: "Internal server error",
            flag: constants.responseFlags.ACTION_FAILED,
            error: error.message
          });
        });
    }

    function transactionHistory(callback) {
      const contractAddress = "0x89d24a6b4ccb1b6faa2625fe562bdd9a23260359";
      var txlist = api.account.tokentx(
        addresses[0].address,
        contractAddress,
        1,
        "latest",
        "desc"
      );

      txlist
        .then(function(Data) {
          callback(null, Data);
        })
        .catch(function(error) {
          var txlist = [];
          if (error == "NOTOK") callback(null, txlist);
        });
    }

    resultArr.push(balanceDetails, transactionHistory);

    async.parallel(resultArr, function(newErr, newRes) {
      var balance = {};
      balance.balance = newRes[0].result;
      if (newRes[1].length == 0) var txHistory = newRes[1];
      else var txHistory = newRes[1].result;

      return res.send({
        log: "Data Fetched Successfully",
        transactions: txHistory,
        balanceHistory: balance,
        flag: constants.responseFlags.ACTION_COMPLETE
      });
    });
  } else {
    var resultArr = [];
    let btcAddresses = [];

    for (var i = 0; i < addresses.length; i++) {
      btcAddresses.push(addresses[i].address);
    }

    function getUtxo(callback) {
      var utxo = [];
      blockexplorer
        .getUnspentOutputs(btcAddresses, {})
        .then(utxoArr => {
          utxoArr = utxoArr.unspent_outputs;
          for (var i = 0; i < utxoArr.length; i++) {
            var utxoObj = {};

            utxoObj.txid = utxoArr[i].tx_hash_big_endian;
            utxoObj.vout = utxoArr[i].tx_output_n;
            utxoObj.scriptPubKey = utxoArr[i].script;
            utxoObj.amount = parseFloat(utxoArr[i].value);
            if (utxoArr[i].confirmations == 0) continue;
            utxoObj.confirmations = utxoArr[i].confirmations;

            utxo.push(utxoObj);
          }

          callback(null, utxo);
        })
        .catch(error => {
          console.log(error);
          callback(null, utxo);
        });
    }

    function balanceDetails(callback) {
      let transactions = [];
      blockexplorer.getMultiAddress(btcAddresses, {}).then(result => {
        var finalObj = {};
        var txs = result.txs;
        for (var i = 0; i < txs.length; i++) {
          var transactionObj = {};

          transactionObj.transaction_id = txs[i].hash;
          if (txs[i].result < 0) {
            transactionObj.transaction_status = 1;
            transactionObj.amount = Unit.fromSatoshis(
              Math.abs(txs[i].result)
            ).to(Unit.BTC);
          } else {
            transactionObj.transaction_status = 0;
            transactionObj.amount = Unit.fromSatoshis(
              Math.abs(txs[i].result)
            ).to(Unit.BTC);
          }

          transactions.push(transactionObj);
        }

        finalObj.transactions = transactions;
        finalObj.addresses = result.addresses;
        finalObj.balance = Unit.fromSatoshis(result.wallet.final_balance).to(
          Unit.BTC
        );
        callback(null, finalObj);
      });
    }

    resultArr.push(getUtxo, balanceDetails);

    async.parallel(resultArr, function(newErr, newRes) {
      var utxo = { utxo: newRes[0], balance: parseFloat(newRes[1].balance) };
      var result = newRes[1].transactions;
      var addresses = newRes[1].addresses;

      return res.send({
        log: "Data Fetched Successfully",
        transactions: result,
        addresses: addresses,
        balanceHistory: utxo,
        flag: constants.responseFlags.ACTION_COMPLETE
      });
    });
  }
}

function login(req, res) {
  var handlerInfo = {
    apiModule: "users",
    apiHandler: "createKeys"
  };

  var private_key_hash = req.body.private_key_hash;
  var public_key_hash = req.body.public_key_hash;

  if (utils.checkBlank([private_key_hash, public_key_hash])) {
    return res.send(constants.parameterMissingResponse);
  }

  var Query =
    "SELECT * FROM tb_users where private_key_hash = ? AND public_key_hash = ?";

  var tt = connection.query(
    sqlQuery,
    [private_key_hash, public_key_hash],
    function(err, result) {
      if (err) {
        return res.send({
          log: "Internal server error",
          flag: constants.responseFlags.ACTION_FAILED,
          Error: err
        });
      }

      if (result.length == 0) {
        // new user registration

        registerNewUser(private_key_hash, public_key_hash, function(
          newErr,
          newRes
        ) {
          if (newErr) {
            return res.send({
              log: "Internal server error",
              flag: constants.responseFlags.ACTION_FAILED,
              Error: err
            });
          }
          res.send({
            log: "User Registered successfully",
            flag: constants.responseFlags.ACTION_COMPLETE,
            wallet_id: newRes
          });
        });
      } else {
        res.send({
          log: "User login successfully",
          flag: constants.responseFlags.ACTION_COMPLETE,
          wallet_id: result[0].wallet_id
        });
      }
    }
  );
}

function registerNewUser(private_key_hash, public_key_hash, callback) {
  var wallet_id = uniqueid.generate();

  var sqlQuery =
    "INSERT INTO tb_users (wallet_id,public_key_hash, private_key_hash, logged_on) VALUES(?, ?,?, NOW())";
  var tt = connection.query(
    sqlQuery,
    [wallet_id, public_key_hash, private_key_hash],
    function(err, result) {
      if (err) {
        callback(err, null);
      }

      callback(null, wallet_id);
    }
  );
}
