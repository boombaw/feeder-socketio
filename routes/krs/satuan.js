const { io } = require("../../websocket");
const Kelas = require("../../repository/kelas");
const {
	getMatakuliahFeeder,
	syncInsertKelasKuliah,
	syncUpdateKelasKuliah,
	getListKelas,
	token,
} = require("../../services/feeder");

const repoKelas = new Kelas();
const skrs = io.of("/sync_krs_satuan");

skrs.on("connection", async (socket) => {
	let userId = socket.id;

	let eventName = "sync-krs-satuan";
	socket.on(eventName, async (params) => {});
});

module.exports = skrs;
