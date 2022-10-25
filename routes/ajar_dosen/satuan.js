const { io } = require("../../websocket");

const AjarDosen = require("../../repository/ajar_dosen");

const dosen = io.of("/sync-dosen-satuan");

dosen.on("connection", async (socket) => {
	let userId = socket.id;

	socket.on("sync-dosen-satuan", async (params) => {
		let { kd_jadwal, tahun } = JSON.parse(params);

		let data = await AjarDosen.getJadwalDosen(kd_jadwal);

		console.log(data);
		// dosen.to(userId).emit("sync-dosen-satuan", data);
	});
});
