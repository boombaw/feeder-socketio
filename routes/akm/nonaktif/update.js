const { io } = require("../websocket");
const db = require("../database/mysql/conn");

const { token } = require("../services/feeder");

const updateAKMNA = io.of("/update-akm-na");

updateAKMNA.on("connection", async (socket) => {
	let userId = socket.id;

	socket.on("update-akm-na", async (data) => {
		let { kd_prodi, tahun } = JSON.parse(data);

		feederToken = await token();
		updateAKMNA
			.to(userId)
			.emit(
				"info",
				JSON.stringify({ message: "Sedang mengambil token" })
			);
	});
});

updateAKMNA.on("error", async (err) => {
	console.log(`connect_error due to ${err.message}`);
});

updateAKMNA.on("disconnect", async (reason) => {
	console.log(`disconnect due to ${reason}`);
});
