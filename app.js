const Path = require("path");
const fs = require("fs-extra");
const express = require("express");
const bodyParser = require("body-parser");
const jwt = require("express-jwt");
const service = require("./lib");
const Logger = require("./Logger");

const ROOT = process.env.JX_SERVICE_SHARE_FOLDER;
const LOGS = Path.resolve(ROOT, "./logs");

//init Logger
Logger.init(LOGS);

const app = express();

// common settings
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
// app.use(jwt({ secret, credentialsRequired: false }));

// routes
app.use("/", service({
    root: ROOT,
    logger: new Logger()
}));

// 404
app.use((req, res, next) => {
    const error = new Error();
    error.statusCode = 404;
    error.status = "Not Found";
    error.message = "Not Found";
    next(error);
});

// error
app.use((err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    res.status(statusCode);
    return res.send(err);
});

module.exports = app;