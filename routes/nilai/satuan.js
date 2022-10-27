const { io } = require("../../websocket");
const {
	token,
	getListKelasCahe,
	idRegistrasiMahasiswa,
	UpdateNilaiPerkuliahan,
} = require("../../services/feeder");

const Nilai = require("../../repository/nilai");
const repoNilai = new Nilai();

const Kelas = require("../../repository/kelas");
const repoKelas = new Kelas();

const snilai = io.of("sync_nilai_satuan");
const eventName = "sync-nilai-satuan";
const totalEventName = "total_nilai_satuan_";

snilai.on("connection", async (socket) => {
	let userID = socket.id;
	let kd_jadwal = socket.handshake.query.kd_jadwal;

	socket.on(eventName, async (params) => {
		let { kd_prodi, tahun, sms, randomID } = JSON.parse(params);

		try {
			if (kd_jadwal === undefined) {
				throw new SyntaxError("'Kode Jadwal' is required.");
			}

			try {
				const jadwal = await repoKelas.getJadwalByKdJadwal(
					kd_jadwal,
					tahun,
					kd_prodi
				);
				const listNilai = await repoNilai.getNilaiTransaksi(kd_jadwal);

				// send total to client
				snilai
					.to(userID)
					.emit(
						`${totalEventName}${randomID}`,
						JSON.stringify({ total: listNilai.length })
					);

				// get token feeder
				let feederToken = await token();
				snilai
					.to(userID)
					.emit(
						"info",
						JSON.stringify({ message: "Sedang mengambil token" })
					);

				let { error_code, error_desc, data } = feederToken;

				if (error_code == 0) {
					let { token: tokenFeeder } = data;

					if (jadwal === null) {
						snilai.to(userID).emit(
							"error",
							JSON.stringify({
								error: "Kelas kuliah tidak di temukan",
							})
						);
					} else {
						let {
							id_kelas_kuliah,
							kelas,
							nama_matakuliah,
							kd_matakuliah,
						} = jadwal[0];
						let matkul = `${nama_matakuliah} (${kd_matakuliah})`;

						let kode_mata_kuliah = kd_matakuliah
							.replace(/\s/g, "")
							.replaceAll("-", "")
							.replaceAll("–", "")
							.trim();
						if (id_kelas_kuliah === null) {
							id_kelas_kuliah = await getListKelasCahe(
								tokenFeeder,
								{
									kode_mata_kuliah,
									nama_kelas_kuliah: kelas
										.replace(/\s/g, "")
										.substr(0, 5),
									sms,
									kd_jadwal,
									tahun,
								}
							);

							if (id_kelas_kuliah === null) {
								error_desc = "Kelas belum di sinkronisasi";
								snilai
									.to(userID)
									.emit(
										"error",
										JSON.stringify({ error: error_desc })
									);
							}
						}

						for (let i = 0; i < listNilai.length; i++) {
							const row = listNilai[i];
							let {
								npm,
								nama,
								nilai_indeks,
								nilai_akhir,
								bobot,
							} = row;
							let response = {};

							response.list = {
								npm,
								nama,
								matkul,
								nilai_indeks,
								nilai_akhir,
								order: i + 1,
							};

							let idReg = await idRegistrasiMahasiswa(
								tokenFeeder,
								row.npm
							);

							({ error_code, error_desc, data } = idReg);

							if (error_code === 0) {
								let { id_registrasi_mahasiswa } = data.shift();
								let key = {
									id_registrasi_mahasiswa,
									id_kelas_kuliah,
								};

								let record = {
									nilai_angka:
										nilai_akhir > 100 ? 0 : nilai_akhir,
									nilai_huruf: nilai_indeks,
									nilai_indeks: bobot.toString(),
								};

								const respUpdateNilai =
									await UpdateNilaiPerkuliahan(
										tokenFeeder,
										record,
										key
									);

								({ error_code, error_desc, data } =
									respUpdateNilai);

								if (error_code === 0) {
								}
								response.error_code = error_code;
								response.error_desc = error_desc;
								response.list.status = `<span class="badge rounded-pill bg-success " style="font-size:0.8rem !important">Berhasil</span>`;
							} else {
								response.error_code = "0";
								response.error_desc = error_desc;
								response.list.status = `<span class="badge rounded-pill bg-danger " style="font-size:0.8rem !important">Gagal</span>`;
							}
							snilai
								.to(userID)
								.emit(eventName, JSON.stringify(response));
						}
					}
				} else {
					snilai
						.to(userID)
						.emit("error", JSON.stringify({ error: error_desc }));
				}
			} catch (error) {
				let errMessage = "";
				if (error instanceof SyntaxError) {
					errMessage = error.message;
				} else if (error instanceof ReferenceError) {
					errMessage = error.message;
				} else {
					errMessage = error.stack;
				}

				snilai
					.to(userID)
					.emit("error", JSON.stringify({ error: ` ${errMessage}` }));
			}
		} catch (error) {
			let errMessage = "";
			if (error instanceof SyntaxError) {
				errMessage = error.message;
			} else if (error instanceof ReferenceError) {
				errMessage = error.message;
			} else {
				errMessage = error.stack;
			}

			snilai
				.to(userID)
				.emit("error", JSON.stringify({ error: ` ${errMessage}` }));
		}
	});
});
