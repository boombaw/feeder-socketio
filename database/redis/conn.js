const redis = require("redis");
const config = require("../../util/config");

// const url = `redis://${config.redis.username}:${config.redis.password}@${config.redis.host}:${config.redis.port}`;

const redisClient = redis.createClient({
	socket: {
		host: config.redis.host,
		port: config.redis.port,
	},
	username: config.redis.username,
	password: config.redis.password,
	database: process.env.NODE_ENV === "production" ? 0 : 9,
});
// const redisClient = redis.createClient({ url: url });

redisClient.on("error", (err) => {
	console.log("Error Redis Connection : ", err);
});

redisClient.connect();

module.exports = redisClient;
