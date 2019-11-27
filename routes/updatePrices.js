const rp = require("request-promise");

setInterval(updatePrices, 600000);

function updatePrices() {
  const requestOptions = {
    method: "GET",
    uri: "https://api.getcoinsafe.app/fetch_usd_data",
    json: true,
    gzip: true
  };

  rp(requestOptions)
    .then(response => {
      console.log("updated");

      setTimeout(updateEth, 2000);
    })
    .catch(err => {
      console.log("API call error:", err);
    });
}

function updateEth() {
  const requestOptions = {
    method: "GET",
    uri: "https://api.getcoinsafe.app/fetch_eth_data",
    json: true,
    gzip: true
  };

  rp(requestOptions)
    .then(response => {
      console.log("updated");
      setTimeout(updateBTC, 2000);
    })
    .catch(err => {
      console.log("API call error:", err);
    });
}
function updateBTC() {
  const requestOptions = {
    method: "GET",
    uri: "https://api.getcoinsafe.app/fetch_btc_data",
    json: true,
    gzip: true
  };

  rp(requestOptions)
    .then(response => {
      console.log("updated");
    })
    .catch(err => {
      console.log("API call error:", err);
    });
}
