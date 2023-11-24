let express = require("express");
let routes = require("./routes");

let app = express();

app.get("/flip", routes.coinFlipRoute);

module.exports.app = app;