const { io } = require("../../websocket");
const redisClient = require("../../database/redis/conn");
const Kelas = require("../../repository/kelas");
const {
	getMatakuliahFeeder,
	syncInsertKelasKuliah,
	syncUpdateKelasKuliah,
	getListKelas,
	token,
} = require("../../services/feeder");

const repoKelas = new Kelas();
const allKelas = io.of("/sync_kelas_collection");

allKelas.on("connection", async (socket) => {
	let userId = socket.id;
	let randID = socket.handshake.query.randomID;

	let eventName = "sync-kelas-collection";
	socket.on(eventName, async (params) => {
		let { kd_prodi, tahun, sms } = JSON.parse(params);

		const listJadwal = await repoKelas.getJadwalProdi(kd_prodi, tahun);

		if (listJadwal !== null) {
			let feederToken = await token();
			allKelas
				.to(userId)
				.emit(
					"info",
					JSON.stringify({ message: "Sedang mengambil token" })
				);
			let { error_code, error_desc, data } = feederToken;

			if (error_code == 0) {
				let { token: tokenFeeder } = data;

				allKelas
					.to(userId)
					.emit(
						"total_kelas_" + randID,
						JSON.stringify({ total: listJadwal.length })
					);

				allKelas.to(userId).emit(
					"info",
					JSON.stringify({
						message: "Sedang memproses data, silahkan tunggu",
					})
				);
				for (let i = 0; i < listJadwal.length; i++) {
					let {
						kd_matakuliah,
						kelas,
						tanggal_mulai_efektif,
						tanggal_akhir_efektif,
						lingkup_kelas,
						mode_kuliah,
						kd_jadwal,
					} = listJadwal[i];

					let kode_mata_kuliah = kd_matakuliah
						.replace(/\s/g, "")
						.replaceAll("-", "")
						.replaceAll("–", "")
						.trim();
					let matakuliahFeeder = await getMatakuliahFeeder(
						tokenFeeder,
						kode_mata_kuliah,
						sms
					);
					({ error_code, error_desc, data } = matakuliahFeeder);

					if (error_code === 0) {
						let mkFeeder = data[0];
						let { id_matkul, nama_mata_kuliah } = mkFeeder;

						let args = {
							id_matkul,
							tanggal_mulai_efektif,
							tanggal_akhir_efektif,
							id_prodi: sms,
							id_semester: tahun,
							nama_kelas_kuliah: kelas
								.replace(/\s/g, "")
								.substr(0, 5),
							lingkup: lingkup_kelas,
							mode: mode_kuliah,
						};

						const listKelasFeeder = await getListKelas(
							tokenFeeder,
							{
								kode_mata_kuliah,
								nama_kelas_kuliah: kelas
									.replace(/\s/g, "")
									.substr(0, 5),
								sms,
								tahun,
							}
						);

						({ error_code, error_desc, data } = listKelasFeeder);

						let response = {};
						let matkul = `${nama_mata_kuliah} (${kd_matakuliah})`;
						response.list = {
							matkul,
							kelas,
							randID,
							order: i + 1,
						};

						let keyRedis = `kelas_${sms}_${kd_jadwal}`;

						if (error_code === 0 && data.length > 0) {
							let { id_kelas_kuliah } = data[0];

							// set redis
							// 259200 = 3 hari
							await redisClient.setEx(
								keyRedis,
								259200,
								id_kelas_kuliah
							);

							let key = {
								id_kelas_kuliah,
							};

							const respUpdateKelas = await syncUpdateKelasKuliah(
								tokenFeeder,
								args,
								key
							);

							({ error_code, error_desc, data } =
								respUpdateKelas);
							if (error_code === 0) {
								await repoKelas.updateJadwal(
									kd_jadwal,
									id_kelas_kuliah
								);
								response.list.status = `<span class="badge rounded-pill bg-success " style="font-size:0.8rem !important">Berhasil</span>`;
							} else {
								response.list.status = `<span class="badge rounded-pill bg-danger " style="font-size:0.8rem !important">Gagal</span>`;
							}
						} else {
							const respKelasKuliah = await syncInsertKelasKuliah(
								tokenFeeder,
								args
							);
							({ error_code, error_desc, data } =
								respKelasKuliah);
							let { id_kelas_kuliah } = data;

							// set redis
							// 259200 = 3 hari
							await redisClient.setEx(
								keyRedis,
								259200,
								id_kelas_kuliah
							);

							if (error_code === 0) {
								await repoKelas.updateJadwal(
									kd_jadwal,
									id_kelas_kuliah
								);
								response.list.status = `<span class="badge rounded-pill bg-success " style="font-size:0.8rem !important">Berhasil</span>`;
							} else {
								response.list.status = `<span class="badge rounded-pill bg-danger " style="font-size:0.8rem !important">Gagal</span>`;
							}
						}

						response.error_code = error_code;
						response.error_desc = error_desc;

						allKelas.emit(eventName, JSON.stringify(response));
					} else {
						allKelas
							.to(userId)
							.emit(
								"error",
								JSON.stringify({ error: error_desc })
							);
					}
				}
			} else {
				allKelas
					.to(userId)
					.emit("error", JSON.stringify({ error: error_desc }));
			}
		} else {
			allKelas
				.to(userId)
				.emit(
					"error",
					JSON.stringify({ error: "Kelas tidak ditemukan" })
				);
		}
	});
});

module.exports = allKelas;
