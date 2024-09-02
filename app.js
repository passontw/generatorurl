const express = require("express");
const swagger = require("express-swagger-generator");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const packageJson = require("./package.json");

const {NODE_ENV, APP_DOMAIN} = process.env;
const swaggerOptions = {
  swaggerDefinition: {
    info: {
      title: "Generator short URL API Service",
      description: "提供 Todo App ",
      version: `${packageJson.version} - ${NODE_ENV}`,
    },
    host: APP_DOMAIN,
    produces: ["application/json"],
    schemes: ["http", "https"],
    securityDefinitions: {
      JWT: {
        type: "apiKey",
        in: "header",
        name: "Authorization",
        description: "JWT token",
      },
    },
  },
  route: {
    url: "/api-docs",
    docs: "/api-docs.json",
  },
  basedir: __dirname,
  files: ["./routes/*.js"],
};

const indexRouter = require("./routes/index");

const app = express();

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use("/", indexRouter);

// Add GET /health-check express route
app.get("/health-check", (req, res) => {
  res.json({
    success: true,
    data: { status: "WORKING" },
  });
});

swagger(app)(swaggerOptions);

module.exports = app;
