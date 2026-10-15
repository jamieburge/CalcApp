let express = require("express");
let path = require("path");
let routes = require("./routes");

let app = express();

app.get("/flip", routes.coinFlipRoute);
app.use(express.static(path.join(__dirname, "public")));

if (require.main === module) {
  let port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`Randomiser running on http://localhost:${port}`));
}

module.exports.app = app;
