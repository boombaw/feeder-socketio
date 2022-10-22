const { io } = require("../../websocket");

const { db } = require("../../database/mysql/conn");

const { SELECT_MABA_PRODI } = require("../../database/query/query");

const Feeder = require("../../repository/feeder");

let repoFeeder = new Feeder();

const { token, syncBioMaba } = require("../../services/feeder");

const { getKelas } = require("../../util/helper");

const mabaCollection = io.of("/sync-maba-collection");

async function allMaba(kd_prodi, angkatan, tahun) {
	let sqlQuery = SELECT_MABA_PRODI;

	if (kd_prodi === "74101" || kd_prodi === "61101") {
		let semester = angkatan % 2;

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

	sqlQuery += " LIMIT 10";

	const data = await db.sequelize
		.query(sqlQuery, {
			replacements: {
				angkatan,
				kd_prodi,
			},
			raw: true,
			type: db.sequelize.QueryTypes.SELECT,
			logging: false,
		})
		.catch((err) => {
			console.log(err);
		});
	return data;
}

mabaCollection.on("connection", async (socket) => {
	let userId = socket.id;

	socket.on("sync-maba-collection", async (params) => {
		let { kd_prodi, angkatan, tahun } = JSON.parse(params);

		let feederToken = await token();
		mabaCollection
			.to(userId)
			.emit(
				"info",
				JSON.stringify({ message: "Sedang mengambil token" })
			);
		let { error_code, error_desc, data } = feederToken;
		if (error_code == 0) {
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
				let nisn = row.nisn.length > 10 ? "0" : row.nisn;
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
				let npwp = row.npwp.replace(".", "").replace("-", "");
				let jenis_tinggal =
					row.jenis_tinngal === 0 ? row.jenis_tinggal : 1;
				let handphone = row.no_hp.replace("+62", "0");

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

				await syncBioMaba(tokenFeeder, npm, nama, argsBiodata)
					.then((value) => {
						value.npm = npm;
						value.nama = nama;
						responseList.push(value);
					})
					.catch((err) => {
						console.log(err);
					});
				// ({ error_code, error_desc, data } = respBio);
				// let response = {};

				// response.error_code = error_code;
				// response.error_desc = error_desc;

				// mabaCollection.to(userId).emit(
				// 	"sync-maba-collection",
				// 	JSON.stringify(response)
				// );
			}
			let listResult = [];
			try {
				listResult = await Promise.allSettled(responseList);
			} catch (error) {
				console.log(error);
			}

			let listValueResult = [];
			let index = 1;
			listResult.forEach((valueResult) => {
				if (valueResult.status === "fulfilled") {
					let { error_code, error_desc, npm, nama } =
						valueResult.value;

					let response = {};
					if (error_code === 0) {
						response.list = {
							order: index,
							npm: npm,
							name: nama,
							status: `<span class="badge rounded-pill bg-success " style="font-size:0.8rem !important">Berhasil</span>`,
						};
					} else {
						response.list = {
							order: index,
							npm: npm,
							name: nama,
							status: `<span class="badge rounded-pill bg-danger " style="font-size:0.8rem !important">Gagal</span>`,
						};
					}

					response.error_code = error_code;
					response.error_desc = error_desc;

					index += 1;
					// listValueResult.push(valueResult.value);
					listValueResult.push(response);
				}
			});

			listValueResult.forEach((element) => {
				setTimeout(() => {
					"", 1000;
				});
				console.log(element);
			});

			// mabaCollection
			// 	.to(userId)
			// 	.emit("sync-maba-collection", JSON.stringify(listValueResult));
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
