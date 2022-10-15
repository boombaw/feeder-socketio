const Sequelize = require("sequelize");

const dbName = process.env.SIA_DB_NAME;
const dbUser = process.env.SIA_DB_USER;
const dbHost = process.env.SIA_DB_HOST;
const dbPass = process.env.SIA_DB_PASS;
const dbPort = process.env.SIA_DB_PORT;
const dbDialect = process.env.SIA_DB_DRIVER;

const sequelize = new Sequelize(dbName, dbUser, dbPass, {
	host: dbHost,
	dialect: dbDialect,
	port: dbPort,
});

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

sequelize
	.authenticate()
	.then(() => {
		console.log("Connection has been established successfully.");
	})
	.catch((error) => {
		console.error("Unable to connect to the database: ", error);
	});

module.exports = db;
