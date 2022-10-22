const Sequelize = require("sequelize");
const config = require("../../util/config");

const sequelize = new Sequelize(
	config.sia.dbName,
	config.sia.dbUser,
	config.sia.dbPass,
	{
		host: config.sia.dbHost,
		dialect: config.sia.dbDialect,
		port: config.sia.dbPort,
	}
);

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

const databaseMaba = new Sequelize(
	config.peembe.dbName,
	config.peembe.dbUser,
	config.peembe.dbPass,
	{
		host: config.peembe.dbHost,
		dialect: config.peembe.dbDialect,
		port: config.peembe.dbPort,
	}
);

module.exports = { db, databaseMaba };
