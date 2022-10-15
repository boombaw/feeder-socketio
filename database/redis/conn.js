const redis = require("redis");

const config = {
	host: process.env.REDIS_HOST,
	port: process.env.REDIS_PORT,
	password: process.env.REDIS_PASSWORD,
};

const redisClient = redis.createClient(config);

redisClient.on("error", (err) => {
	console.log("Error Redis Connection" + err);
});

redisClient.connect();
module.exports = redisClient;
