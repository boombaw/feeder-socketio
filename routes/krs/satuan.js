const { io } = require("../../websocket");
const redisClient = require("../../database/redis/conn");
const Kelas = require("../../repository/kelas");
const Feeder = require("../../repository/feeder");
const {
	getMatakuliahFeeder,
	getListKelas,
	insertPesertaKelas,
	idRegistrasiMahasiswa,
	getListKelasCahe,
	token,
} = require("../../services/feeder");

const repoKelas = new Kelas();
const repoFeeder = new Feeder();
const skrs = io.of("/sync_krs_satuan");

skrs.on("connection", async (socket) => {
	let userId = socket.id;
	let kd_jadwal = socket.handshake.query.kd_jadwal;

	let eventName = "sync-krs-satuan";
	socket.on(eventName, async (params) => {
		let { kd_prodi, tahun, sms } = JSON.parse(params);

		let feederToken = await token();
		skrs.to(userId).emit(
			"info",
			JSON.stringify({ message: "Sedang mengambil token" })
		);
		let { error_code, error_desc, data } = feederToken;

		if (error_code == 0) {
			let { token: tokenFeeder } = data;

			const listKrs = await repoKelas.getPesertaKelas(kd_jadwal);

			let keyRedis = `kelas_${sms}_${kd_jadwal}`;

			if (listKrs !== null) {
				let { kd_matakuliah, kelas } = listKrs[0];

				let kode_mata_kuliah = kd_matakuliah
					.replace(/\s/g, "")
					.replaceAll("-", "")
					.replaceAll("–", "")
					.trim();

				const id_kelas_kuliah = await getListKelasCahe(tokenFeeder, {
					kode_mata_kuliah,
					nama_kelas_kuliah: kelas.replace(/\s/g, "").substr(0, 5),
					sms,
					tahun,
					kd_jadwal,
				});
				if (id_kelas_kuliah === null) {
					skrs.to(userId).emit(
						"error",
						JSON.stringify({
							error: "Kelas kuliah tidak di temukan",
						})
					);
				} else {
					// send total information to clien
					skrs.to(userId).emit(
						"total_krs_satuan_" + kd_jadwal,
						JSON.stringify({ total: listKrs.length })
					);

					let response = {};
					for (let i = 0; i < listKrs.length; i++) {
						let row = listKrs[i];
						// let smsProdiMhs = await repoFeeder.smsProdi(row.prodi);
						let idReg = await idRegistrasiMahasiswa(
							tokenFeeder,
							row.npm_mahasiswa
						);

						({ error_code, error_desc, data } = idReg);

						if (error_code === 0) {
							let { id_registrasi_mahasiswa } = data.shift();

							let args = {
								id_registrasi_mahasiswa,
								id_kelas_kuliah,
							};

							const respInsertPeserta = await insertPesertaKelas(
								tokenFeeder,
								args
							);

							({ error_code, error_desc, data } =
								respInsertPeserta);
							if (error_code === 0) {
								response.list = {
									npm: row.npm_mahasiswa,
									nama: row.nama,
									matkul: row.nama_matakuliah,
									kelas: row.kelas,
									dosen: row.nama_dosen,
									status: `<span class="badge rounded-pill bg-success " style="font-size:0.8rem !important">Berhasil</span>`,
								};
							} else {
								response.list = {
									npm: row.npm_mahasiswa,
									nama: row.nama,
									matkul: row.nama_matakuliah,
									kelas: row.kelas,
									dosen: row.nama_dosen,
									status: `<span class="badge rounded-pill bg-danger " style="font-size:0.8rem !important">Gagal</span>`,
								};
							}
						} else {
							response.list = {
								npm: row.npm_mahasiswa,
								nama: row.nama,
								matkul: row.nama_matakuliah,
								kelas: row.kelas,
								dosen: row.nama_dosen,
								status: `<span class="badge rounded-pill bg-danger " style="font-size:0.8rem !important">Gagal</span>`,
							};
						}
						response.list.order = i + 1;
						response.error_code = error_code;
						response.error_desc = error_desc;
						skrs.to(userId).emit(
							eventName,
							JSON.stringify(response)
						);
					}
				}
			} else {
				skrs.to(userId).emit(
					"error",
					JSON.stringify({ error: "daftar peserta tidak ditemukan" })
				);
			}
		} else {
			skrs.to(userId).emit(
				"error",
				JSON.stringify({ error: error_desc })
			);
		}
	});
});

module.exports = skrs;
