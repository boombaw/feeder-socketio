const { io } = require("../../websocket");
const {
	token,
	getIDDosen,
	idRegistrasiDosen,
	getListKelasCahe,
	getDosenPengajar,
	InsertDosenPengajar,
	UpdateDosenPengajar,
} = require("../../services/feeder");

const Kelas = require("../../repository/kelas");
const repoKelas = new Kelas();

const AjarDosen = require("../../repository/ajar_dosen");
const ajarDosen = new AjarDosen();

const sdosen = io.of("/sync_dosen_collection");
const eventName = "sync-dosen-collection";

const insertPengajaran = async (tokenFeeder, params, response, socket) => {
	const resp = await InsertDosenPengajar(tokenFeeder, params);

	let { error_code, error_desc, data } = resp;

	if (error_code === 0) {
		response.list.status = `<span class="badge rounded-pill bg-success " style="font-size:0.8rem !important">Berhasil</span>`;
	} else {
		response.list.status = `<span class="badge rounded-pill bg-danger" style="font-size:0.8rem !important">Gagal</span>`;
	}

	response.error_code = error_code;
	response.error_desc = error_desc;

	socket.to(response.userId).emit(eventName, JSON.stringify({ response }));
};

const updatePengajaran = async (tokenFeeder, key, params, response, socket) => {
	const resp = await UpdateDosenPengajar(tokenFeeder, params, key);

	let { error_code, error_desc, data } = resp;

	if (error_code === 0) {
		response.list.status = `<span class="badge rounded-pill bg-success " style="font-size:0.8rem !important">Berhasil</span>`;
	} else {
		response.list.status = `<span class="badge rounded-pill bg-danger" style="font-size:0.8rem !important">Gagal</span>`;
	}

	response.error_code = error_code;
	response.error_desc = error_desc;
	socket.to(response.userId).emit(eventName, JSON.stringify({ response }));
};

const getDosenAjar = async (tokenFeeder, params, socket) => {
	let { id_registrasi_dosen, id_kelas_kuliah, record, response } = params;
	const dataAjar = await getDosenPengajar(tokenFeeder, {
		id_registrasi_dosen,
		id_kelas_kuliah,
	});

	({ error_code, error_desc, data } = dataAjar);

	if (error_code === 0 && data.length > 0) {
		let { id_aktivitas_mengajar } = data[0];

		let key = {
			id_aktivitas_mengajar,
			id_registrasi_dosen,
			id_kelas_kuliah,
		};

		// update
		const resUpdate = await updatePengajaran(
			tokenFeeder,
			key,
			record,
			response,
			socket
		);
	}

	if (error_code === 0 && data.length === 0) {
		// insert
		const resInsert = await insertPengajaran(
			tokenFeeder,
			record,
			response,
			socket
		);
	}
};

sdosen.on("connection", async (socket) => {
	let userId = socket.id;

	socket.on(eventName, async (params) => {
		let { kd_prodi, sms, tahun, randID } = JSON.parse(params);

		try {
			let jadwalDosen = await repoKelas.getJadwalProdi(kd_prodi, tahun);

			if (jadwalDosen.length !== 0) {
				// send total dosen to client
				sdosen
					.to(userId)
					.emit(
						"total_dosen_collection_" + randID,
						JSON.stringify({ total: jadwalDosen.length })
					);

				// get token feeder
				let feederToken = await token();
				sdosen
					.to(userId)
					.emit(
						"info",
						JSON.stringify({ message: "Sedang mengambil token" })
					);
				let { error_code, error_desc, data } = feederToken;

				if (error_code == 0) {
					let { token: tokenFeeder } = data;

					let id_dosen = null;
					try {
						for (let i = 0; i < jadwalDosen.length; i++) {
							let {
								nidn_dosen: nidn,
								kd_dosen: nid,
								nupn_dosen: nupn,
								nama_dosen: nama,
								kelas,
								sks_matakuliah,
								nama_matakuliah,
								kd_matakuliah,
								id_kelas_kuliah,
								kd_jadwal,
							} = jadwalDosen[i];

							if (nidn !== "" && nidn !== null) {
								id_dosen = nidn;
							} else if (nupn !== "" && nupn !== null) {
								id_dosen = nupn;
							}

							const dataSDM = await getIDDosen(tokenFeeder, {
								nidn: id_dosen,
							});

							({ error_code, error_desc, data } = dataSDM);

							let response = {};
							let matkul = `${nama_matakuliah} (${kd_matakuliah})`;
							response.userId = userId;
							response.list = {
								dosen: nama,
								matkul,
								kelas,
								kd_jadwal,
								order: i + 1,
							};

							let kode_mata_kuliah = kd_matakuliah
								.replace(/\s/g, "")
								.replaceAll("-", "")
								.replaceAll("–", "")
								.trim();

							if (error_code === 0 && data.length > 0) {
								let { id_dosen } = data[0];

								let id_registrasi_dosen =
									await idRegistrasiDosen(tokenFeeder, {
										id_dosen,
										tahun,
									});

								if (id_registrasi_dosen === null) {
									error_desc =
										"Penugasan Dosen tidak ditemukan";
									response.list.status = `<span class="badge rounded-pill bg-danger " style="font-size:0.8rem !important">Gagal</span>`;
								} else {
									if (id_kelas_kuliah === null) {
										id_kelas_kuliah =
											await getListKelasCahe(
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
											error_desc =
												"Kelas belum di sinkronisasi";
											response.list.status = `<span class="badge rounded-pill bg-danger " style="font-size:0.8rem !important">Gagal</span>`;
										} else {
											let record = {
												id_registrasi_dosen,
												id_kelas_kuliah,
												sks_substansi_total:
													sks_matakuliah,
												rencana_minggu_pertemuan: 16,
												realisasi_minggu_pertemuan: 16,
												id_jenis_evaluasi: 1,
											};

											let args = {
												record,
												id_registrasi_dosen,
												id_kelas_kuliah,
												response,
											};
											await getDosenAjar(
												tokenFeeder,
												args,
												socket
											);
										}
									} else {
										let record = {
											id_registrasi_dosen,
											id_kelas_kuliah,
											sks_substansi_total: sks_matakuliah,
											rencana_minggu_pertemuan: 16,
											realisasi_minggu_pertemuan: 16,
											id_jenis_evaluasi: 1,
										};

										let args = {
											record,
											id_registrasi_dosen,
											id_kelas_kuliah,
											response,
										};
										await getDosenAjar(
											tokenFeeder,
											args,
											socket
										);
									}
								}
							} else {
								error_desc = "Dosen tidak ditemukan";
								response.list.status = `<span class="badge rounded-pill bg-danger " style="font-size:0.8rem !important">Gagal</span>`;
							}

							response.error_code = error_code;
							response.error_desc = error_desc;
							sdosen
								.to(userId)
								.emit(eventName, JSON.stringify(response));
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

						sdosen
							.to(userId)
							.emit(
								"error",
								JSON.stringify({ error: ` ${errMessage}` })
							);
					}
				} else {
					sdosen
						.to(userId)
						.emit("error", JSON.stringify({ error: error_desc }));
				}
			} else {
				sdosen
					.to(userId)
					.emit(
						"error",
						JSON.stringify({ error: `Jadwal Tidak Ditemukan` })
					);
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

			sdosen
				.to(userId)
				.emit("error", JSON.stringify({ error: ` ${errMessage}` }));
		}

		// dosen.to(userId).emit("sync-dosen-collection", data);
	});
});

module.exports = sdosen;
