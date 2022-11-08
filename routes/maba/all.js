const { io } = require("../../websocket");
const { db } = require("../../database/mysql/conn");
const { SELECT_MABA_PRODI } = require("../../database/query/query");

const Feeder = require("../../repository/feeder");
let repoFeeder = new Feeder();

const {
	token,
	refreshToken,
	idRegistrasiMahasiswa,
	insertRiwayatPendidikan,
	updateRiwayatPendidikan,
	syncBioMaba,
} = require("../../services/feeder");

const { getKelas } = require("../../util/helper");
const config = require("../../util/config");

const mabaCollection = io.of("/sync-maba-collection");

async function allMaba(kd_prodi, angkatan, tahun) {
	let sqlQuery = SELECT_MABA_PRODI;

	let angkatanMhs = tahun.substr(0, 4);
	let listProdiKhusus = ["74101", "61101", "61001", "62101", "70101"];
	if (listProdiKhusus.includes(kd_prodi)) {
		let semester = tahun % 2;

		if (semester === 0) {
			// semester genap
			sqlQuery += " AND mid(NIMHSMSMHS, 9, 1) = 2";
		} else {
			if (tahun % 2 === 0) {
				sqlQuery += " AND mid(NIMHSMSMHS, 9, 1) = 2";
			} else {
				sqlQuery += " AND mid(NIMHSMSMHS, 9, 1) = 1";
			}
		}
	}
	// testing only
	// sqlQuery += " LIMIT 5";
	const data = await db.sequelize
		.query(sqlQuery, {
			replacements: {
				angkatan: angkatanMhs,
				kd_prodi,
			},
			raw: true,
			type: db.sequelize.QueryTypes.SELECT,
			// logging: false,
		})
		.catch((err) => {
			console.log(err);
		});
	return data;
}

mabaCollection.on("connection", async (socket) => {
	let userId = socket.id;

	socket.on("sync-maba-collection", async (params) => {
		let { kd_prodi, angkatan, tahun, sms } = JSON.parse(params);

		let feederToken = await token();
		mabaCollection
			.to(userId)
			.emit(
				"info",
				JSON.stringify({ message: "Sedang mengambil token" })
			);
		let { error_code, error_desc, data } = feederToken;
		if (error_code == 0) {
			mabaCollection.to(userId).emit(
				"info",
				JSON.stringify({
					message: "Sedang memproses data, silahkan tunggu",
				})
			);

			const { token: tokenFeeder } = data;
			// 	// get maba
			let mabaData = await allMaba(kd_prodi, angkatan, tahun);

			mabaCollection
				.to(userId)
				.emit(
					"total_maba_" + kd_prodi,
					JSON.stringify({ total: mabaData.length })
				);

			responseList = [];
			for (let i = 0; i < mabaData.length; i++) {

				try {
					let row = mabaData[i];
					let npm = row.npm;
					let kelasMaba = getKelas(row.kelas);
					let jalurMaba = await repoFeeder.jalurMaba(row.no_ujian);
					let bayarMaba = await repoFeeder.bayarMaba(
						kd_prodi,
						kelasMaba,
						jalurMaba
					);

					let jk = row.jk === "1" ? "L" : "P";
					let desa = row.desa === null ? row.jalan : row.desa;
					let nisn = "0";
					if (row.nisn !== null) {
						nisn = row.nisn.length > 10 ? "0" : row.nisn;
					}
					let penerimaKps = row.penerima_kps === "Y" ? "1" : "0";

					let kebutuhanKhusus = 0;
					if (row.kebutuhan_khusus === "O") {
						kebutuhanKhusus = "8192";
					}

					if (row.kebutuhan_khusus === "K") {
						kebutuhanKhusus = "2048";
					}

					let nik = row.nik;
					let nama = row.nama.trim().toLowerCase().toUpperCase();
					let npwp =
						row.npwp === null
							? ""
							: row.npwp.replace(".", "").replace("-", "");
					let jenis_tinggal =
						row.jenis_tinngal === 0 ? row.jenis_tinggal : 1;
					let handphone = row.no_hp.replace("+62", "0");

					let response = {};

					response.list = {
						order: i + 1,
						npm: npm,
						name: nama,
					};

					try {
						let argsBiodata = {
							nik,
							nisn,
							npwp,
							handphone,
							nama_mahasiswa: nama,
							jenis_kelamin: jk,
							tempat_lahir: row.tpt_lahir,
							tanggal_lahir: row.tgl_lahir,
							id_agama: row.agama,
							kewarganegaraan: row.kewarganegaraan,
							jalan: row.jalan,
							rt: row.rt,
							rw: row.rw,
							kelurahan: desa.substr(0, 60),
							kode_pos: row.kode_pos,
							id_wilayah: row.kec,
							id_jenis_tinggal: jenis_tinggal,
							email: row.email,
							penerima_kps: penerimaKps,
							nomor_kps: row.penerima_kps,
							nama_ayah: row.nama_ayah,
							nama_ibu_kandung: row.nama_ibu,
							id_kebutuhan_khusus: kebutuhanKhusus,
							id_kebutuhan_khusus_ayah: 0,
							id_kebutuhan_khusus_ibu: 0,
						};

						const respBio = await syncBioMaba(
							tokenFeeder,
							npm,
							nama,
							argsBiodata
						);

						({ error_code, error_desc, data } = respBio);
						if (error_code === 0) {
							let { id_mahasiswa } = data;
							let dataRiwayatPendidikan = {};

							let tmpNpm = npm.trim().split("");
							let id_jenis_daftar = null;
							let tanggal_daftar = await repoFeeder.tanggalDaftar(
								row.no_ujian
							);

							let listProdiKhusus = [
								"74101",
								"61101",
								"61001",
								"62101",
								"70101",
							];
							if (listProdiKhusus.includes(kd_prodi)) {
								if (tmpNpm[7] === "5") {
									id_jenis_daftar = 1;
								} else {
									id_jenis_daftar = 2;
									let sks_diakui = await repoFeeder.sksDiakui(
										npm,
										kd_prodi
									);
									let {
										id_prodi_asal,
										id_pt_asal: id_perguruan_tinggi_asal,
									} = await repoFeeder.ptKonversi(npm);

									let dataKonversi = {
										sks_diakui,
										id_prodi_asal,
										id_perguruan_tinggi_asal,
									};

									dataRiwayatPendidikan = { ...dataKonversi };
								}
							} else {
								if (tmpNpm[8] === "5") {
									id_jenis_daftar = 1;
								} else {
									id_jenis_daftar = 2;
									let sks_diakui = await repoFeeder.sksDiakui(
										npm,kd_prodi
									);
									let {
										id_prodi_asal,
										id_pt_asal: id_perguruan_tinggi_asal,
									} = await repoFeeder.ptKonversi(npm);

									let dataKonversi = {
										sks_diakui,
										id_prodi_asal,
										id_perguruan_tinggi_asal,
									};

									dataRiwayatPendidikan = { ...dataKonversi };
								}
							}

							let obj2 = {
								id_mahasiswa,
								id_jenis_daftar,
								tanggal_daftar,
								id_perguruan_tinggi: config.feeder.id_pt,
								id_periode_masuk: tahun,
								nim: npm,
								id_prodi: sms,
								biaya_masuk: bayarMaba,
							};

							dataRiwayatPendidikan = { ...dataRiwayatPendidikan, ...obj2 };

							let newToken = await refreshToken();

							let { data: dataNewToken } = newToken;

							let { token: tokenNew } = dataNewToken;

							({ error_code, error_desc, data } =
								await idRegistrasiMahasiswa(tokenNew, npm));

							if (error_code === 0 && data.length > 0) {
								let { id_registrasi_mahasiswa } = data[0];
								({ error_code, error_desc, data } =
									await updateRiwayatPendidikan(
										tokenNew,
										id_registrasi_mahasiswa,
										dataRiwayatPendidikan
									));
			
									if (error_code === 0) {
										response.list.status = `<span class="badge rounded-pill bg-success " style="font-size:0.8rem !important">Berhasil</span>`;
									} else {
										response.list.status = `<span class="badge rounded-pill bg-danger " style="font-size:0.8rem !important">Gagal</span>`;
										response.error_code = error_code;
										response.error_desc = `${error_desc}`;
									}
							}

							if (error_code === 0 && data.length === 0) {
								({ error_code, error_desc, data } =
									await insertRiwayatPendidikan(
										tokenNew,
										dataRiwayatPendidikan
									));

								if (error_code === 0) {
									response.list.status = `<span class="badge rounded-pill bg-success " style="font-size:0.8rem !important">Berhasil</span>`;
								} else {
									response.list.status = `<span class="badge rounded-pill bg-danger " style="font-size:0.8rem !important">Gagal</span>`;
									response.error_code = error_code;
									response.error_desc = `${error_desc}`;
								}
							}

							if (error_code > 0) {
								response.list.status = `<span class="badge rounded-pill bg-danger " style="font-size:0.8rem !important">Gagal</span>`;
							}

							response.error_code = error_code;
							response.error_desc = `${error_desc}`;
						} else {
							response.list.status = `<span class="badge rounded-pill bg-danger " style="font-size:0.8rem !important">Gagal</span>`;
							response.error_code = error_code;
							response.error_desc = `${error_desc}`;
						}
					} catch (error) {
						response.list.status = `<span class="badge rounded-pill bg-danger " style="font-size:0.8rem !important">Gagal</span>`;
						response.error_code = error_code ?? 5;
						response.error_desc = `${error.message} of ${npm}`;
					}

					mabaCollection
						.to(userId)
						.emit("sync-maba-collection", JSON.stringify(response));
				}
				catch(error) {
					response.list.status = `<span class="badge rounded-pill bg-danger " style="font-size:0.8rem !important">Gagal</span>`;
					response.error_code = error_code ?? 5;
					response.error_desc = `Error: ${error.message} of npm ${npm}`;
				}
				
			}
		} else {
			mabaCollection
				.to(userId)
				.emit("error", JSON.stringify({ error: error_desc }));
		}
	});

	socket.on("disconnect", () => {
		console.log("user disconnected");
	});

	socket.on("error", (err) => {
		console.log(`error connection user : ${userId}, error : ${err}`);
	});
});

module.exports = mabaCollection;
