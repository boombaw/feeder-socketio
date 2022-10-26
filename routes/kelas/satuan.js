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
const skelas = io.of("/sync_kelas_satuan");

skelas.on("connection", async (socket) => {
	let userId = socket.id;
	let kd_jadwal = socket.handshake.query.kd_jadwal;

	let eventName = "sync-kelas-satuan";
	socket.on(eventName, async (params) => {
		let { kd_prodi, tahun, sms } = JSON.parse(params);

		const listKelas = await repoKelas.getJadwalByKdJadwal(
			kd_jadwal,
			tahun,
			kd_prodi
		);

		if (listKelas !== null) {
			let feederToken = await token();
			skelas
				.to(userId)
				.emit(
					"info",
					JSON.stringify({ message: "Sedang mengambil token" })
				);
			let { error_code, error_desc, data } = feederToken;

			if (error_code == 0) {
				let { token: tokenFeeder } = data;

				skelas
					.to(userId)
					.emit(
						"total_kelas_satuan_" + kd_jadwal,
						JSON.stringify({ total: listKelas.length })
					);

				let {
					kd_matakuliah,
					kelas,
					tanggal_mulai_efektif,
					tanggal_akhir_efektif,
					lingkup_kelas,
					mode_kuliah,
					nama_matakuliah,
				} = listKelas[0];

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

				skelas.to(userId).emit(
					"info",
					JSON.stringify({
						message: "Sedang mengambil data matakuliah",
					})
				);

				({ error_code, error_desc, data } = matakuliahFeeder);

				if (error_code == 0) {
					let mkFeeder = data[0];
					try {
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

						skelas.to(userId).emit(
							"info",
							JSON.stringify({
								message: "Sedang mengambil data kelas",
							})
						);

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

						skelas.to(userId).emit(
							"info",
							JSON.stringify({
								message:
									"Sedang memproses data, silahkan tunggu",
							})
						);

						let response = {};
						let matkul = `${nama_mata_kuliah} (${kd_matakuliah})`;
						response.list = {
							matkul,
							kelas,
							kd_jadwal,
							order: 1,
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

						skelas
							.to(userId)
							.emit(eventName, JSON.stringify(response));
					} catch {
						let response = {};
						let matkul = `${nama_matakuliah} (${kd_matakuliah})`;
						response.list = {
							matkul,
							kelas,
							randID,
							order: 1,
						};

						response.error_code = error_code;
						response.error_desc = `Periksa kembali kode matakuliah dan kelas yang anda masukkan - ${kode_mata_kuliah} - ${kelas}`;

						skelas
							.to(userId)
							.emit(eventName, JSON.stringify(response));
					}
				} else {
					skelas
						.to(userId)
						.emit("error", JSON.stringify({ error: error_desc }));
				}
			} else {
				skelas
					.to(userId)
					.emit("error", JSON.stringify({ error: error_desc }));
			}
		} else {
			skelas
				.to(userId)
				.emit(
					"error",
					JSON.stringify({ error: "Kelas tidak ditemukan" })
				);
		}
	});
});

module.exports = skelas;
