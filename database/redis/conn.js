const redis = require("redis");
const config = require("../../util/config");

const url = `redis://${config.redis.username}:${config.redis.password}@${config.redis.host}:${config.redis.port}`;

const redisClient = redis.createClient({ url: url });

redisClient.on("error", (err) => {
	console.log("Error Redis Connection : ", err);
});

redisClient.connect();

module.exports = redisClient;
