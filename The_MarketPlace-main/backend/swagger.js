
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Marketplace API",
      version: "1.0.0",
      description: "API documentation for The Marketplace"
    }
  },
  apis: ["./routes/*.js"],
};

const specs = swaggerJsdoc(options);

const mountSwagger = function (app) {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));
};
module.exports = mountSwagger;