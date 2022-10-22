const config = {
	feeder: {
		id_pt: "1a4b2deb-519d-4e27-81ef-435c3bb661d7",
	},
	redis: {
		host: process.env.REDIS_HOST,
		port: process.env.REDIS_PORT,
		username: process.env.REDIS_USERNAME,
		password: process.env.REDIS_PASSWORD,
	},
	sia: {
		dbName: process.env.SIA_DB_NAME,
		dbUser: process.env.SIA_DB_USER,
		dbHost: process.env.SIA_DB_HOST,
		dbPass: process.env.SIA_DB_PASS,
		dbPort: process.env.SIA_DB_PORT,
		dbDialect: process.env.SIA_DB_DRIVER,
	},
	peembe: {
		dbName: process.env.PMB_DB_NAME,
		dbUser: process.env.PMB_DB_USER,
		dbHost: process.env.PMB_DB_HOST,
		dbPass: process.env.PMB_DB_PASS,
		dbPort: process.env.PMB_DB_PORT,
		dbDialect: process.env.PMB_DB_DRIVER,
	},
};

module.exports = config;
