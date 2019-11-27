"use strict";
/**
 * @module Private Key Recovery Users
 */

/*
 * Module dependencies
 */

require("dotenv").config();
var request = require("request");
var crypto = require("crypto");
var async = require("async");
var constants = require("./constants");
var logging = require("./logging");
var messenger = require("./messenger");
const nodemailer = require("nodemailer");
var smtpTransport = require("nodemailer-smtp-transport");
var sendgrid = require("sendgrid")(process.env.SENDGRID_API_KEY);
var shortid = require("shortid");
var async = require("async");

exports.sendEmail = sendEmail;
exports.testDatabase = testDatabase;
exports.fetchEmailId = fetchEmailId;
exports.chooseUsername = chooseUsername;
exports.registerUser = registerUser;
exports.userTrustData = userTrustData;
exports.userChangeTrustData = userChangeTrustData;
exports.searchUser = searchUser;
exports.sendOtpViaEmail = sendOtpViaEmail;
exports.sendRecoveryOtpViaEmail = sendRecoveryOtpViaEmail;
exports.fetchSetupRecoveryStatus = fetchSetupRecoveryStatus;
exports.verifyRecoveryOtpViaEmail = verifyRecoveryOtpViaEmail;
exports.verifyOtpViaEmail = verifyOtpViaEmail;
exports.loginUser = loginUser;
exports.sendRecoveryTrustData = sendRecoveryTrustData;
exports.fetchRecoveryRequests = fetchRecoveryRequests;
exports.updateRecoveryTrustData = updateRecoveryTrustData;
exports.fetchRecoveryTrustData = fetchRecoveryTrustData;
exports.updateRequestRecoveryStatus = updateRequestRecoveryStatus;
exports.updateRecoveryStatusTable = updateRecoveryStatusTable;

var transporter = nodemailer.createTransport(
  smtpTransport({
    service: "gmail",
    secure: true,
    port: 587,
    host: "smtp.gmail.com",

    auth: {
      user: "support@getcoinsafe.app",
      pass: process.env.password
    },
    tlsL: {
      rejectUnauthorized: false
    }
  })
);

function chooseUsername(req, res) {
  let username = req.body.username;

  var sqlQuery =
    "SELECT * from tb_recovery_request WHERE username = ? AND recovery_status <= 5";
  var tt = connection.query(sqlQuery, [username], function(err, result) {
    if (err) {
      return res.send({
        log: "Internal server error",
        flag: constants.responseFlags.ACTION_FAILED
      });
    }

    if (result.length > 0) {
      return res.send({
        log: "Username not available",
        flag: constants.responseFlags.ACTION_FAILED
      });
    }

    res.send({
      log: "Username is available",
      flag: constants.responseFlags.ACTION_COMPLETE
    });
  });
}

function updateEmailStatus(email, callback) {
  var sqlQuery = "SELECT * from tb_recovery_users WHERE user_email = ?";
  var tt = connection.query(sqlQuery, [email], function(err, result) {
    if (err) {
      callback(err, null);
    }

    if (result.length > 0) {
      callback(null, result.length);
    }

    callback(null, result);
  });
}

function updateUserEmail(email, publicKeyHash, callback) {
  var sqlQuery =
    "update tb_recovery_users SET user_email = ?  WHERE user_public_key_hash = ?";
  var tt = connection.query(sqlQuery, [email, publicKeyHash], function(
    err,
    result
  ) {
    if (err) {
      return callback(err, null);
    }
    console.log(result);

    callback(null, result);
  });
}

function fetchEmailId(req, res) {
  let user_public_key_hash = req.body.user_public_key_hash;

  var sqlQuery =
    "SELECT user_email from tb_recovery_users WHERE user_public_key_hash = ?";
  var tt = connection.query(sqlQuery, [user_public_key_hash], function(
    err,
    result
  ) {
    if (err) {
      return res.send({
        log: "Internal server error",
        flag: constants.responseFlags.ACTION_FAILED,
        Error: err
      });
    }

    res.send({
      log: "User Registered successfully",
      flag: constants.responseFlags.ACTION_COMPLETE,
      result: result
    });
  });
}

function sendEmail(req, res) {
  var reqParams = req.body;
  var handlerInfo = {
    apiModule: "commonfunctions",
    apiHandler: "sendEmail"
  };

  var email = reqParams.user_email;

  var otp = Math.floor(Math.random() * 1000000 + 1);

  res.send({
    log: "Otp sent successfully",
    otp: otp,
    flag: constants.responseFlags.ACTION_COMPLETE
  });
}

function testDatabase(req, res) {
  var handlerInfo = {
    apiModule: "registerUser",
    apiHandler: "registerUser"
  };

  var sqlQuery = "SELECT * from tb_trust";
  var tt = connection.query(sqlQuery, function(err, result) {
    if (err) {
      return res.send({
        log: "Internal server error",
        flag: constants.responseFlags.ACTION_FAILED,
        Error: err
      });
    }

    res.send({
      log: "User Registered successfully",
      flag: constants.responseFlags.ACTION_COMPLETE,
      result: result
    });
  });
}

function registerUser(req, res) {
  var handlerInfo = {
    apiModule: "registerUser",
    apiHandler: "registerUser"
  };
  var publicKey = req.body.user_public_key;
  var privateKeyHash = req.body.user_private_key_hash;

  var sqlQuery =
    "INSERT INTO tb_users (user_public_key, user_private_key_hash, registered_on) VALUES(?, ?, NOW())";
  var tt = connection.query(sqlQuery, [publicKey, privateKeyHash], function(
    err,
    result
  ) {
    if (err) {
      return res.send({
        log: "Internal server error",
        flag: constants.responseFlags.ACTION_FAILED,
        Error: err
      });
    }

    res.send({
      log: "User Registered successfully",
      flag: constants.responseFlags.ACTION_COMPLETE,
      result: result
    });
  });
}

function userChangeTrustData(req, res) {
  var handlerInfo = {
    apiModule: "userTrustData",
    apiHandler: "userTrustData"
  };

  /**
  "trust_data" : [
        {
          "user_public_key":"id",
          "encrypted_key_data":"data"
        },
        {
          "user_public_key":"id",
          "encrypted_key_data":"data"
        },
        {
        "user_public_key":"id",
          "encrypted_key_data":"data"
        }
    ]
  **/

  var trustData = [];
  let trustIdArr = req.body.trustIdArr;

  trustData = req.body.trust_data;
  var user_public_key_hash = req.body.user_public_key_hash;
  var deviceData = req.body.deviceData;

  blockUserTrustedDevices(trustIdArr, function(blockErr, blockRes) {
    if (blockErr) {
      return res.send({
        log: "Error in updating recovery devices",
        flag: constants.responseFlags.ACTION_FAILED,
        error: statusErr
      });
    }

    var i;
    for (i = 0; i < trustData.length; i++) {
      var Query =
        "INSERT INTO tb_trust (trust_id,user_public_key_hash, trust_data, created_on) VALUES(?, ?,?, NOW())";
      var tt = connection.query(
        Query,
        [
          trustData[i].trust_id,
          trustData[i].user_public_key_hash,
          trustData[i].encrypted_key_data
        ],
        function(err, result) {
          if (err) {
            return res.send({
              log: "Internal server error",
              flag: constants.responseFlags.ACTION_FAILED
            });
          }

          console.log(result);
        }
      );
    }

    if (i == 2 || i == 3 || i == 5) {
      var recovery_status = 2; //friends added successfully

      updateRecoveryStatusInRecoveryUsers(
        recovery_status,
        user_public_key_hash,
        deviceData,
        function(statusErr, statusRes) {
          if (statusErr) {
            return res.send({
              log: "Error in updating recovery status",
              flag: constants.responseFlags.ACTION_FAILED,
              error: statusErr
            });
          }
          res.send({
            log: "Devices added successfully",
            flag: constants.responseFlags.ACTION_COMPLETE
          });
        }
      );
    }
  });
}

function blockUserTrustedDevices(trustIdArr, callback) {
  var pending = trustIdArr.length;
  var trustIdArr = trustIdArr;
  let status = 1;
  var requestDetails = [];
  for (var i in trustIdArr) {
    var sqlQuery = "update tb_trust SET trust_status = ?  WHERE trust_id = ?";
    var tt = connection.query(sqlQuery, [status, trustIdArr[i]], function(
      err,
      result
    ) {
      if (err) {
        return callback(err, null);
      }

      requestDetails.push(result[0]);
      if (0 === --pending) {
        return callback(null, requestDetails);
      }
    });
  }
}

function userTrustData(req, res) {
  var handlerInfo = {
    apiModule: "userTrustData",
    apiHandler: "userTrustData"
  };

  /**
  "trust_data" : [
        {
          "user_public_key":"id",
          "encrypted_key_data":"data"
        },
        {
          "user_public_key":"id",
          "encrypted_key_data":"data"
        },
        {
        "user_public_key":"id",
          "encrypted_key_data":"data"
        }
    ]
  **/

  var trustData = [];

  trustData = req.body.trust_data;
  var user_public_key_hash = req.body.user_public_key_hash;
  var deviceData = req.body.deviceData;
  var i;
  for (i = 0; i < trustData.length; i++) {
    var Query =
      "INSERT INTO tb_trust (trust_id,user_public_key_hash, trust_data, created_on) VALUES(?, ?,?, NOW())";
    var tt = connection.query(
      Query,
      [
        trustData[i].trust_id,
        trustData[i].user_public_key_hash,
        trustData[i].encrypted_key_data
      ],
      function(err, result) {
        if (err) {
          return res.send({
            log: "Internal server error",
            flag: constants.responseFlags.ACTION_FAILED
          });
        }
      }
    );
  }

  if (i == 3 || i == 5 || i == 2) {
    var recovery_status = 2; //friends added successfully

    updateRecoveryStatusInRecoveryUsers(
      recovery_status,
      user_public_key_hash,
      deviceData,
      function(statusErr, statusRes) {
        if (statusErr) {
          return res.send({
            log: "Error in updating recovery status",
            flag: constants.responseFlags.ACTION_FAILED,
            error: statusErr
          });
        }

        res.send({
          log: "Devices added successfully",
          flag: constants.responseFlags.ACTION_COMPLETE
        });
      }
    );
  }
}

function updateRecoveryStatusInRecoveryUsers(
  status,
  public_key_hash,
  deviceData,
  callback
) {
  var sqlQuery =
    "update tb_recovery_users SET recovery_status = ? , trust_data = ?  WHERE user_public_key_hash = ?";
  var tt = connection.query(
    sqlQuery,
    [status, deviceData, public_key_hash],
    function(err, result) {
      if (err) {
        return callback(err, null);
      }
      callback(null, result);
    }
  );
}

function searchUser(req, res) {
  var handlerInfo = {
    apiModule: "searchUser",
    apiHandler: "searchUser"
  };
  var publicKey = req.query.user_public_key;

  var sqlQuery = "SELECT * from tb_users WHERE user_public_key = ?";
  var tt = connection.query(sqlQuery, [publicKey], function(err, result) {
    if (err) {
      return res.send({
        log: "Internal server error",
        flag: constants.responseFlags.ACTION_FAILED
      });
    }
    res.send({
      log: "fetched successfully",
      data: result[0],
      flag: constants.responseFlags.ACTION_COMPLETE
    });
  });
}

function sendOtpViaEmail(req, res) {
  var reqParams = req.body;
  var handlerInfo = {
    apiModule: "commonfunctions",
    apiHandler: "sendOtpViaEmail"
  };

  var email = reqParams.user_email;
  var otp = Math.floor(Math.random() * 1000000 + 1);
  var sessionId = shortid.generate();

  var getDuplicate = "SELECT * FROM tb_recovery_users WHERE user_email = ?";
  var tt = connection.query(getDuplicate, [email], function(dupErr, dupRes) {
    if (dupErr) {
      return res.send({
        log: "internal server error",
        flag: constants.responseFlags.ACTION_FAILED
      });
    }

    if (dupRes.length) {
      return res.send({
        log: "A user already exists with this email",
        flag: constants.responseFlags.ACTION_FAILED
      });
    }
    var mailOptions = {
      from: "Coinsafe Support",
      to: email,
      subject: "Coinsafe Email Verification Request",
      text:
        "Hi,<br><br>" +
        "You are just a step away from verifying your Email on" +
        " Coinsafe app. <br>" +
        "We are sharing a verification OTP with you which is valid for 5 " +
        "minutes and usable only once. <br><br>" +
        "<B> Your OTP: </B>" +
        otp +
        "<br>" +
        "Expires in: 5 minutes only" +
        "<br> <br>" +
        "Best Regards, <br>" +
        "Team Coinsafe",
      html:
        "Hi,<br><br>" +
        "You are just a step away from verifying your Email on Coinsafe app." +
        "We are sharing a verification OTP with you which is valid for 5 " +
        "minutes and usable only once. <br> <br>" +
        "<B> Your OTP: </B>" +
        otp +
        "<br>" +
        "Expires in: 5 minutes only" +
        "<br> <br>" +
        "Best Regards, <br>" +
        "Team Coinsafe"
    };

    transporter.sendMail(mailOptions, function(error, info) {
      if (error) {
        return res.send({
          log: "Error in sending otp",
          flag: constants.responseFlags.ACTION_FAILED,
          error: error
        });
      }

      logOtpIntoDb(handlerInfo, otp, email, sessionId, function(
        otpDbErr,
        otpDbRes
      ) {
        if (otpDbErr) {
          return res.send({
            log: "Error in saving otp",
            flag: constants.responseFlags.ACTION_FAILED,
            error: otpDbErr
          });
        }
        res.send({
          log: "Can setup recovery",
          flag: constants.responseFlags.ACTION_COMPLETE,
          session_id: sessionId
        });
      });
    });
  });
}

function logOtpIntoDb(handlerInfo, oneTimePwd, email, sessionId, callback) {
  var sqlQuery =
    "INSERT INTO tb_otp (otp, email,sessionId,logged_on) VALUES( ?, ? , ?,NOW())";
  var tt = connection.query(sqlQuery, [oneTimePwd, email, sessionId], function(
    err,
    result
  ) {
    if (err) {
      return callback(err, null);
    }
    callback(null, result);
  });
}

function verifyOtpViaEmail(req, res) {
  var reqParams = req.body;
  var handlerInfo = {
    apiModule: "commonfunctions",
    apiHandler: "verifyEmailOtp"
  };

  var otp = req.body.otp;
  var session_id = req.body.session_id;
  var email = req.body.email;
  var public_key_hash = req.body.public_key_hash;
  let mode = req.body.mode;

  verifyOtpInDb(handlerInfo, otp, session_id, function(
    verifyOtpErr,
    verifyOtpRes
  ) {
    if (verifyOtpErr) {
      return res.send({
        log: "internal server error",
        flag: constants.responseFlags.ACTION_FAILED,
        error: verifyOtpErr
      });
    }

    if (verifyOtpRes.length > 0) {
      if (mode == "change") {
        updateUserEmail(email, public_key_hash, function(updateErr, updateRes) {
          if (updateErr) {
            return res.send({
              log: "Error in updating email",
              flag: constants.responseFlags.ACTION_FAILED
            });
          }
          res.send({
            log: "Email updated successfully",
            flag: constants.responseFlags.ACTION_COMPLETE
          });
        });
      } else {
        insertUserDetailsFromEmail(
          handlerInfo,
          email,
          public_key_hash,
          function(userErr, userRes) {
            if (userErr) {
              return res.send({
                log: "User Not verified",
                flag: constants.responseFlags.ACTION_FAILED,
                error: userErr
              });
            } else {
              res.send({
                log: "User verified",
                flag: constants.responseFlags.ACTION_COMPLETE,
                userDetails: userRes
              });
            }
          }
        );
      }
    } else {
      res.send({
        log: "Invalid Otp",
        flag: constants.responseFlags.ACTION_FAILED
      });
    }
  });
}

function verifyOtpInDb(handlerInfo, otp, session_id, callback) {
  var sqlQuery = "SELECT * FROM tb_otp WHERE otp = ? AND sessionId = ?";
  var tt = connection.query(sqlQuery, [otp, session_id], function(err, result) {
    if (err) {
      return callback(err, null);
    }
    return callback(null, result);
  });
}

function insertUserDetailsFromEmail(
  handlerInfo,
  email,
  user_public_key_hash,
  callback
) {
  var status = 1;
  var recovery_status = 1; // for email verification
  var sqlQuery =
    "INSERT INTO tb_recovery_users (user_public_key_hash,user_email,email_status,recovery_status,logged_on) VALUES( ? , ?, ? ,?, NOW())";
  var tt = connection.query(
    sqlQuery,
    [user_public_key_hash, email, status, recovery_status],
    function(err, result) {
      if (err) {
        callback(err, null);
      }
      callback(null, result);
    }
  );
}

function fetchUserDetailsFromEmail(handlerInfo, email, callback) {
  var sqlQuery = "SELECT * FROM tb_recovery_users WHERE user_email = ?";
  var tt = connection.query(sqlQuery, [email], function(err, result) {
    if (err) {
      return callback(err, null);
    }
    callback(null, result);
  });
}

function loginUser(req, res) {
  var handlerInfo = {
    apiModule: "loginUser",
    apiHandler: "loginUser"
  };
  var publicKey = req.body.publicKey;
  var privateKeyHash = req.body.privateKeyHash;

  var sqlQuery =
    "SELECT * from tb_users WHERE user_public_key = ? AND user_private_key_hash = ?";
  var tt = connection.query(sqlQuery, [publicKey, privateKeyHash], function(
    err,
    result
  ) {
    if (err) {
      return res.send({
        log: "Internal server error",
        flag: constants.responseFlags.ACTION_FAILED
      });
    }
    res.send({
      log: "fetched successfully",
      data: result[0],
      flag: constants.responseFlags.ACTION_COMPLETE
    });
  });
}

function sendRecoveryOtpViaEmail(req, res) {
  var reqParams = req.body;
  var handlerInfo = {
    apiModule: "commonfunctions",
    apiHandler: "sendOtpViaEmail"
  };

  var email = reqParams.user_email;
  var otp = Math.floor(Math.random() * 1000000 + 1);
  var sessionId = shortid.generate();

  var getDuplicate = "SELECT * FROM tb_recovery_users WHERE user_email = ?";
  var tt = connection.query(getDuplicate, [email], function(dupErr, dupRes) {
    if (dupErr) {
      return res.send({
        log: "internal server error",
        flag: constants.responseFlags.ACTION_FAILED,
        error: dupErr
      });
    }

    if (dupRes.length == 0) {
      return res.send({
        log: "Recovery is not setup",
        flag: constants.responseFlags.ACTION_FAILED
      });
    }

    if (dupRes[0].recovery_status == 1) {
      return res.send({
        log: "Please complete your recovery setup by adding trusted devices",
        flag: constants.responseFlags.ACTION_COMPLETE,
        recovery_status: dupRes[0].recovery_status
      });
    }

    var mailOptions = {
      from: "Coinsafe Support",
      to: email,
      subject: "Coinsafe Email Verification Request",
      text:
        "Hi,<br><br>" +
        "You are just a step away from verifying your Email on" +
        " Coinsafe app. <br>" +
        "We are sharing a verification OTP with you which is valid for 5 " +
        "minutes and usable only once. <br><br>" +
        "<B> Your OTP: </B>" +
        otp +
        "<br>" +
        "Expires in: 5 minutes only" +
        "<br> <br>" +
        "Best Regards, <br>" +
        "Team Coinsafe",
      html:
        "Hi,<br><br>" +
        "You are just a step away from verifying your Email on Coinsafe app." +
        "We are sharing a verification OTP with you which is valid for 5 " +
        "minutes and usable only once. <br> <br>" +
        "<B> Your OTP: </B>" +
        otp +
        "<br>" +
        "Expires in: 5 minutes only" +
        "<br> <br>" +
        "Best Regards, <br>" +
        "Team Coinsafe"
    };

    transporter.sendMail(mailOptions, function(error, info) {
      if (error) {
        return res.send({
          log: "Error in sending otp",
          flag: constants.responseFlags.ACTION_FAILED,
          error: error
        });
      }

      logOtpIntoDb(handlerInfo, otp, email, sessionId, function(
        otpDbErr,
        otpDbRes
      ) {
        if (otpDbErr) {
          return res.send({
            log: "Error in saving otp",
            flag: constants.responseFlags.ACTION_FAILED,
            error: otpDbErr
          });
        }
        res.send({
          log: "Can request recovery",
          flag: constants.responseFlags.ACTION_COMPLETE,
          session_id: sessionId
        });
      });
    });
  });
}

function verifyRecoveryOtpViaEmail(req, res) {
  var reqParams = req.body;
  var handlerInfo = {
    apiModule: "commonfunctions",
    apiHandler: "verifyEmailOtp"
  };

  var otp = reqParams.otp;
  var session_id = reqParams.session_id;
  var email = reqParams.email;
  verifyOtpInDb(handlerInfo, otp, session_id, function(err, result) {
    if (err) {
      return res.send(constants.databaseErrorResponse);
    }
    if (result.length == 0) {
      return res.send({
        log: "Verification failed",
        flag: constants.responseFlags.ACTION_FAILED
      });
    }

    fetchUserDetailsFromEmail(handlerInfo, email, function(userErr, userRes) {
      if (userErr) return res.send(constants.databaseErrorResponse);

      res.send({
        log: "User verified",
        flag: constants.responseFlags.ACTION_COMPLETE,
        userDetails: userRes[0]
      });
    });
  });
}

function fetchSetupRecoveryStatus(req, res) {
  var reqParams = req.body;
  var handlerInfo = {
    apiModule: "commonfunctions",
    apiHandler: "verifyEmailOtp"
  };

  var publicKeyHash = reqParams.publicKeyHash;

  function recoveryStatus(callback) {
    var getStatus =
      "SELECT * FROM tb_recovery_users WHERE user_public_key_hash = ?";
    var tt = connection.query(getStatus, [publicKeyHash], function(
      statusErr,
      statusRes
    ) {
      if (statusErr) {
        callback(statusErr, null);
      }

      callback(null, statusRes);
    });
  }

  function getRecoveryRequestLength(callback) {
    var getStatus =
      "SELECT * FROM tb_recovery_details WHERE user_public_key_hash = ? AND trust_status = 0";
    var tt = connection.query(getStatus, [publicKeyHash], function(
      error,
      result
    ) {
      if (error) {
        callback(error, null);
      }

      callback(null, result.length);
    });
  }

  let finalArr = [];
  finalArr.push(getRecoveryRequestLength, recoveryStatus);

  async.parallel(finalArr, function(finalErr, finalRes) {
    if (finalErr) {
      return res.send({
        log: "There is some error in fetching Recovery Status",
        flag: constants.responseFlags.ACTION_FAILED
      });
    }

    let requestLength = finalRes[0];
    console.log(finalRes[1]);

    if (finalRes[1].length == 0) {
      return res.send({
        log: "Please Setup Recovery First",
        flag: constants.responseFlags.ACTION_COMPLETE,
        status: 0,
        requestsLength: requestLength
      });
    }

    if (finalRes[1][0].recovery_status == 2) {
      return res.send({
        log: "Fetched Status Successfully",
        flag: constants.responseFlags.ACTION_COMPLETE,
        status: finalRes[1][0].recovery_status,
        devices: finalRes[1][0].trust_data,
        requestsLength: requestLength
      });
    }

    res.send({
      log: "Fetched Status Successfully",
      flag: constants.responseFlags.ACTION_COMPLETE,
      status: finalRes[1][0].recovery_status,
      requestsLength: requestLength
    });
  });
}

function sendRecoveryTrustData(req, res) {
  var reqParams = req.body;
  var handlerInfo = {
    apiModule: "commonfunctions",
    apiHandler: "verifyEmailOtp"
  };

  var publicKeyHash = reqParams.publicKeyHash;
  var newPublicKeyHash = reqParams.newPublicKeyHash;
  var trustData = reqParams.trust_data;
  var username = reqParams.username;
  var request_id = shortid.generate();
  var status = 5;

  var getDuplicate =
    "SELECT * FROM tb_recovery_request WHERE from_public_key_hash = ? AND recovery_status < ?";
  var tt = connection.query(getDuplicate, [publicKeyHash, status], function(
    dupErr,
    dupRes
  ) {
    if (dupErr) {
      return res.send(constants.databaseErrorResponse);
    }

    if (dupRes.length) {
      expirePreviousRequestInDb(dupRes[0].request_id, function(
        expireErr,
        expireRes
      ) {
        if (expireErr) {
          return res.send({
            log: "Error in expiring previous request",
            flag: constants.responseFlags.ACTION_FAILED
          });
        }
      });
    }

    logRequestIntoDb(
      handlerInfo,
      request_id,
      username,
      publicKeyHash,
      newPublicKeyHash,
      function(err, result) {
        if (err) {
          return res.send(constants.databaseErrorResponse);
        }

        logRequestDetails(request_id, trustData, function(userErr, userRes) {
          if (userErr) return res.send(constants.databaseErrorResponse);

          res.send({
            log: "Request Inserted SuccessFully",
            flag: constants.responseFlags.ACTION_COMPLETE,
            result: userRes
          });
        });
      }
    );
  });
}

function expirePreviousRequestInDb(request_id, callback) {
  var status = 7;
  var sqlQuery =
    "update tb_recovery_request SET recovery_status = ?  WHERE request_id = ?";
  var tt = connection.query(sqlQuery, [status, request_id], function(
    err,
    result
  ) {
    if (err) {
      callback(err, null);
    }

    callback(null, result);
  });
}

function logRequestIntoDb(
  handlerInfo,
  request_id,
  username,
  publicKeyHash,
  newPublicKeyHash,
  callback
) {
  var sqlQuery =
    "INSERT INTO tb_recovery_request (username,request_id,from_public_key_hash,new_public_key_hash,logged_on) VALUES( ?, ? , ?, ? , NOW())";
  var tt = connection.query(
    sqlQuery,
    [username, request_id, publicKeyHash, newPublicKeyHash],
    function(err, result) {
      if (err) {
        return callback(err, null);
      }
      callback(null, result);
    }
  );
}

function logRequestDetails(request_id, result, callback) {
  var pending = result.length;
  var requestDetails = [];
  for (var i in result) {
    var sqlQuery =
      "INSERT INTO tb_recovery_details (request_id,user_public_key_hash,public_key_data,logged_on) VALUES( ?, ? , ?,NOW())";
    var tt = connection.query(
      sqlQuery,
      [
        request_id,
        result[i].user_public_key_hash,
        result[i].encrypted_key_data
      ],
      function(err, result) {
        if (err) {
          return callback(err, null);
        }

        requestDetails.push(result[0]);
        if (0 === --pending) {
          return callback(null, requestDetails);
        }
      }
    );
  }
}

function fetchRecoveryRequests(req, res) {
  var reqParams = req.body;
  var handlerInfo = {
    apiModule: "commonfunctions",
    apiHandler: "verifyEmailOtp"
  };

  var publicKeyHash = reqParams.publicKeyHash;
  var resultArr = [];
  var requestDetails = [];

  fetchNewRequestsFromDb(handlerInfo, publicKeyHash, function(err, result) {
    if (err) {
      return res.send(constants.databaseErrorResponse);
    }

    if (result.length == 0)
      return res.send({
        log: "No Requests Found!",
        status: "0",
        result: result
      });

    function fetchRecovery(callback) {
      fetchRecoveryRequestsDetails(result, function(eRR, Ress) {
        if (eRR) {
          return res.send(constants.databaseErrorResponse);
        }

        callback(null, Ress);
      });
    }

    function trustDetails(callback) {
      fetchTrustDataFromPublicKey(handlerInfo, publicKeyHash, function(
        trustErr,
        trustRes
      ) {
        if (trustErr) {
          return res.send(constants.databaseErrorResponse);
        }

        callback(null, trustRes);
      });
    }

    resultArr.push(fetchRecovery, trustDetails);

    async.parallel(resultArr, function(newErr, newRes) {
      var trustDetails = newRes[1];
      var recoveryData = newRes[0];

      res.send({
        trustData: trustDetails,
        recoveryData: recoveryData,
        status: "1"
      });
    });
  });
}

function fetchNewRequestsFromDb(handlerInfo, publicKeyHash, callback) {
  var status = 0;
  var sqlQuery =
    "SELECT * from tb_recovery_details WHERE user_public_key_hash = ? AND trust_status = ?";
  var tt = connection.query(sqlQuery, [publicKeyHash, status], function(
    err,
    result
  ) {
    if (err) {
      return callback(err, null);
    }
    callback(null, result);
  });
}

function fetchRecoveryRequestsDetails(result, callback) {
  var pending = result.length;

  var status = 5;
  var requestDetails = [];
  for (var i in result) {
    var sqlQuery =
      "SELECT * from tb_recovery_request WHERE request_id = ? AND recovery_status < ?";
    var tt = connection.query(
      sqlQuery,
      [result[i].request_id, status],
      function(err, requestIds) {
        if (err) {
          return callback(err, null);
        }

        console.log(requestIds[0]);

        if (result[0]) {
          let requestsObj = {};
          requestsObj.request_id = requestIds[0].request_id;
          requestsObj.username = requestIds[0].username;
          requestsObj.from_public_key_hash = requestIds[0].from_public_key_hash;
          requestsObj.new_public_key_hash = requestIds[0].new_public_key_hash;
          requestsObj.public_key_data = result[i].public_key_data;
          requestDetails.push(requestsObj);
        }

        if (0 === --pending) {
          return callback(null, requestDetails);
        }
      }
    );
  }
}

function fetchTrustDataFromPublicKey(handlerInfo, publicKeyHash, callback) {
  var sqlQuery =
    "SELECT * from tb_trust WHERE user_public_key_hash = ? AND trust_status = 0";
  var tt = connection.query(sqlQuery, [publicKeyHash], function(err, result) {
    if (err) {
      return callback(err, null);
    }
    callback(null, result);
  });
}

function updateRequestRecoveryStatus(req, res) {
  var reqParams = req.body;
  var handlerInfo = {
    apiModule: "commonfunctions",
    apiHandler: "verifyEmailOtp"
  };

  var publicKey = reqParams.publicKey;
  var request_id = reqParams.requestId;

  updateRequestRecoveryStatusIntoDb(
    handlerInfo,
    request_id,
    publicKey,
    trustData,
    function(err, result) {
      if (err) {
        return res.send(constants.databaseErrorResponse);
      }

      res.send({
        flag: constants.responseFlags.ACTION_COMPLETE,
        result: result,
        status: "1"
      });
    }
  );
}

function updateRequestRecoveryStatusIntoDb(
  handlerInfo,
  request_id,
  publicKey,
  callback
) {
  var status = 4;
  var sqlQuery =
    "update tb_recovery_request SET recovery_status = ?  WHERE from_public_key = ? AND request_id = ?";
  var tt = connection.query(sqlQuery, [status, publicKey, request_id], function(
    err,
    result
  ) {
    if (err) {
      return res.send({
        log: "Internal server error",
        flag: constants.responseFlags.ACTION_FAILED
      });
    }

    callback(null, result);
  });
}

function updateRecoveryTrustData(req, res) {
  var reqParams = req.body;
  var handlerInfo = {
    apiModule: "commonfunctions",
    apiHandler: "verifyEmailOtp"
  };

  var publicKeyHash = reqParams.publicKeyHash;
  var status = reqParams.status;
  var trustData = reqParams.trust_data;
  var request_id = reqParams.request_id;

  if (status == 2) {
    updateTrustDataIntoDb(
      handlerInfo,
      request_id,
      publicKeyHash,
      trustData,
      status,
      function(err, result) {
        if (err) {
          return res.send(constants.databaseErrorResponse);
        }
        res.send({
          log: "Updated SuccessFully",
          result: result,
          flag: constants.responseFlags.ACTION_COMPLETE
        });
      }
    );
  } else {
    updateTrustDataIntoDb(
      handlerInfo,
      request_id,
      publicKeyHash,
      trustData,
      status,
      function(err, result) {
        if (err) {
          return res.send(constants.databaseErrorResponse);
        }

        updateRequestTable(handlerInfo, request_id, function(
          trustErr,
          trustRes
        ) {
          if (trustErr) {
            return res.send(constants.databaseErrorResponse);
          }

          res.send({
            log: "Updated SuccessFully",
            result: result,
            flag: constants.responseFlags.ACTION_COMPLETE
          });
        });
      }
    );
  }
}

function updateRecoveryStatusTable(req, res) {
  var reqParams = req.body;
  var handlerInfo = {
    apiModule: "commonfunctions",
    apiHandler: "verifyEmailOtp"
  };

  var status = reqParams.status;
  var request_id = reqParams.request_id;

  var Query =
    "update tb_recovery_request SET recovery_status = ? WHERE request_id = ?";
  var tt = connection.query(Query, [status, request_id], function(Err, Result) {
    if (Err) {
      return res.send({
        log: "Internal server error",
        flag: constants.responseFlags.ACTION_FAILED
      });
    }

    res.send({
      log: "updated successfully",
      flag: constants.responseFlags.ACTION_COMPLETE
    });
  });
}

function updateRequestTable(handlerInfo, request_id, callback) {
  var Query =
    "update tb_recovery_request SET recovery_status = recovery_status + 1  WHERE request_id = ?";
  var tt = connection.query(Query, [request_id], function(Err, Result) {
    if (Err) {
      callback(Err, null);
    }

    callback(null, Result);
  });
}

function updateTrustDataIntoDb(
  handlerInfo,
  request_id,
  publicKeyHash,
  trustData,
  status,
  callback
) {
  var sqlQuery =
    "update tb_recovery_details SET trust_data = ? , trust_status = ? WHERE user_public_key_hash = ? AND request_id = ?";
  var tt = connection.query(
    sqlQuery,
    [trustData, status, publicKeyHash, request_id],
    function(err, result) {
      if (err) {
        return res.send({
          log: "Internal server error",
          flag: constants.responseFlags.ACTION_FAILED
        });
      }

      callback(null, result);
    }
  );
}

function fetchRecoveryTrustData(req, res) {
  var reqParams = req.body;
  var handlerInfo = {
    apiModule: "commonfunctions",
    apiHandler: "verifyEmailOtp"
  };

  var publicKeyHash = reqParams.publicKeyHash;

  fetchRecoveryTrustDataFromDb(handlerInfo, publicKeyHash, function(
    err,
    result
  ) {
    if (err) {
      return res.send(constants.databaseErrorResponse);
    }

    if (result.length) {
      fetchRecoveryTrustDataFromDbDetails(
        handlerInfo,
        result[0].request_id,
        function(detErr, detRes) {
          if (detErr) {
            return res.send(constants.databaseErrorResponse);
          }

          res.send({
            log: "Fetched SuccessFully",
            result: detRes,
            flag: constants.responseFlags.ACTION_COMPLETE
          });
        }
      );
    } else {
      res.send({
        log: "Fetched SuccessFully",
        result: result,
        flag: constants.responseFlags.ACTION_COMPLETE
      });
    }
  });
}

function fetchRecoveryTrustDataFromDb(handlerInfo, publicKey, callback) {
  var status = 6;
  var sqlQuery =
    "SELECT * from tb_recovery_request WHERE from_public_key_hash = ? AND recovery_status <= ? ORDER BY logged_on DESC";
  var tt = connection.query(sqlQuery, [publicKey, status], function(
    err,
    result
  ) {
    if (err) {
      return callback(err, null);
    }
    callback(null, result);
  });
}

function fetchRecoveryTrustDataFromDbDetails(
  handlerInfo,
  request_id,
  callback
) {
  var sqlQuery = "SELECT * from tb_recovery_details WHERE request_id = ?";
  var tt = connection.query(sqlQuery, [request_id], function(err, result) {
    if (err) {
      return callback(err, null);
    }
    callback(null, result);
  });
}
