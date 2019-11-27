const rp = require("request-promise");
var constants = require("./constants");

exports.getCoinDataUSD = getCoinDataUSD;
exports.getCoinDataETH = getCoinDataETH;
exports.getCoinDataBTC = getCoinDataBTC;

function getCoinDataBTC(req, res) {
  const requestOptions = {
    method: "GET",
    uri: "https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest",
    qs: {
      symbol: "BTC,ETH,XMR,GUSD,DAI",
      convert: "BTC"
    },
    headers: {
      "X-CMC_PRO_API_KEY": "214fb92b-b41d-4c56-833f-6e5c68d8f612"
    },
    json: true,
    gzip: true
  };

  rp(requestOptions)
    .then(response => {
      let count = 0;
      for (key in response.data) {
        count++;
        var asset_value = response.data[key].quote.BTC.price.toFixed(3);

        var sqlQuery =
          "update tb_assets SET asset_value_btc = ? WHERE asset_symbol = ?";
        var tt = connection.query(sqlQuery, [asset_value, key], function(
          err,
          result
        ) {
          if (err) {
            console.log(err);
          }
        });
      }

      if (count == 5) {
        res.send({
          log: "updated"
        });
      }
    })
    .catch(err => {
      console.log("API call error:", err.message);
    });
}

function getCoinDataETH(req, res) {
  const requestOptions = {
    method: "GET",
    uri: "https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest",
    qs: {
      symbol: "BTC,ETH,XMR,GUSD,DAI",
      convert: "ETH"
    },
    headers: {
      "X-CMC_PRO_API_KEY": "214fb92b-b41d-4c56-833f-6e5c68d8f612"
    },
    json: true,
    gzip: true
  };

  rp(requestOptions)
    .then(response => {
      let count = 0;
      for (key in response.data) {
        count++;
        var asset_value = response.data[key].quote.ETH.price.toFixed(3);

        var sqlQuery =
          "update tb_assets SET asset_value_eth = ? WHERE asset_symbol = ?";
        var tt = connection.query(sqlQuery, [asset_value, key], function(
          err,
          result
        ) {
          if (err) {
            console.log(err);
          }
        });
      }

      if (count == 5) {
        res.send({
          log: "updated"
        });
      }
    })
    .catch(err => {
      console.log("API call error:", err.message);
    });
}

function getCoinDataUSD(req, res) {
  const requestOptions = {
    method: "GET",
    uri: "https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest",
    qs: {
      symbol: "BTC,ETH,XMR,GUSD,DAI",
      convert: "USD"
    },
    headers: {
      "X-CMC_PRO_API_KEY": "214fb92b-b41d-4c56-833f-6e5c68d8f612"
    },
    json: true,
    gzip: true
  };

  rp(requestOptions)
    .then(response => {
      let count = 0;
      for (key in response.data) {
        count++;
        var asset_value = response.data[key].quote.USD.price.toFixed(3);

        var sqlQuery =
          "update tb_assets SET asset_value_usd = ? WHERE asset_symbol = ?";
        var tt = connection.query(sqlQuery, [asset_value, key], function(
          err,
          result
        ) {
          if (err) {
            console.log(err);
          }
        });
      }

      if (count == 5) {
        res.send({
          log: "updated"
        });
      }
    })
    .catch(err => {
      console.log("API call error:", err.message);
    });
}
