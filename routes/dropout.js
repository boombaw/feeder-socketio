const { io } = require("../websocket");
const { db } = require("../database/mysql/conn");
const { SELECT_DROPOUT } = require("../database/query/query");

require("../util/helper");

const {
	token,
	idRegistrasiMahasiswa,
	insertDOFeeder,
	getLastAKMFeeder,
} = require("../services/feeder");
const { JenisKeluar } = require("../util/helper");

const updateDropout = io.of("/update-dropout");
const insertDropout = io.of("/insert-dropout");

insertDropout.on("connection", async (socket) => {
	let userId = socket.id;

	socket.on("insert-dropout", async (data) => {
		let { kd_prodi, tahun, sms } = JSON.parse(data);

		feederToken = await token();
		insertDropout
			.to(userId)
			.emit(
				"info",
				JSON.stringify({ message: "Sedang mengambil token" })
			);

		({ error_code, error_desc, data } = feederToken);
		if (error_code == 0) {
			let { token } = data;
			let dropoutData = await ListDropout(kd_prodi, tahun);

			// send total data to client
			insertDropout
				.to(userId)
				.emit(
					"total_insert_dropout_" + kd_prodi,
					JSON.stringify({ total: dropoutData.length })
				);

			if (dropoutData.length > 0) {
				for (let i = 0; i < dropoutData.length; i++) {
					dropoutData[i].sms = sms;

					const response = await insertDO(
						token,
						i + 1,
						dropoutData[i]
					);
					({ error_code, error_desc } = response);

					if (!response.hasOwnProperty("list") && error_code > 0) {
						insertDropout
							.to(userId)
							.emit(
								"error",
								JSON.stringify({ error: error_desc })
							);
					} else {
						insertDropout
							.to(userId)
							.emit("insert-dropout", JSON.stringify(response));
					}
				}
			} else {
				insertDropout
					.to(userId)
					.emit(
						"info",
						JSON.stringify({ message: "Data tidak ditemukan" })
					);
			}
		} else {
			insertDropout
				.to(userId)
				.emit("error", JSON.stringify({ error: error_desc }));
		}
	});
});

async function ListDropout(kd_prodi, tahun) {
	let dropoutData = await db.sequelize.query(SELECT_DROPOUT, {
		replacements: { kd_prodi, tahun },
		type: db.sequelize.QueryTypes.SELECT,
		logging: false,
	});

	return dropoutData;
}

async function insertDO(token, index, params) {
	let response = {};

	let { error_code, error_desc, data } = await idRegistrasiMahasiswa(
		token,
		params.npm
	);

	if (error_code == 0) {
		let dataAKM = await getLastAKMFeeder(token, params.npm, params.sms);

		({ error_code, error_desc, data } = dataAKM);
		if (error_code == 0) {
			let { id_registrasi_mahasiswa, ipk } = data.shift();

			let jenis_keluar = JenisKeluar.Dikeluarkan;
			switch (params.alasan) {
				case 2: // Dikeluarkan
					jenis_keluar = JenisKeluar.Dikeluarkan;
					break;
				case 1: // mengundurkan diri
					jenis_keluar = JenisKeluar.MengundurkanDiri;
					break;
				case 3: // wafat
					jenis_keluar = JenisKeluar.Wafat;
					break;
			}

			let args = {
				id_registrasi_mahasiswa,
				id_jenis_keluar: jenis_keluar,
				nomor_sk_yudisium: params.skep,
				tanggal_sk_yudisium: params.tgl_skep,
				tanggal_keluar: params.tgl_skep,
				keterangan: "",
				ipk,
				id_periode_keluar: params.tahunajaran,
			};

			({ error_code, error_desc, data } = await insertDOFeeder(
				token,
				args
			));

			if (error_code === 0) {
				response.list = {
					order: index,
					npm: params.npm,
					name: params.name,
					status: `<span class="badge rounded-pill bg-success " style="font-size:0.8rem !important">Berhasil</span>`,
				};
			} else {
				response.list = {
					order: index,
					npm: params.npm,
					name: params.name,
					status: `<span class="badge rounded-pill bg-danger " style="font-size:0.8rem !important">Gagal</span>`,
				};
			}
		}
	}

	response.error_code = error_code;
	response.error_desc = error_desc;

	return response;
	// let insertData = insertDOFeeder(token, );
}
