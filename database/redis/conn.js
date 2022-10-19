const redis = require("redis");

const config = {
	host: process.env.REDIS_HOST,
	port: process.env.REDIS_PORT,
	username: process.env.REDIS_USERNAME,
	password: process.env.REDIS_PASSWORD,
};

const url = `redis://${config.username}:${config.password}@${config.host}:${config.port}`;

const redisClient = redis.createClient({ url: url });

redisClient.on("error", (err) => {
	console.log("Error Redis Connection : ", err);
});

redisClient.connect();

module.exports = redisClient;
