const { io } = require("../websocket");
const db = require("../database/mysql/conn");
const { GetLulusan } = require("../database/query/query");

const {
	token,
	idRegistrasiMahasiswa,
	insertLulusan,
} = require("../services/feeder");

const lulusan = io.of("/lulusan");

// db.sequelize
// 	.sync()
// 	.then(() => {
// 		console.log("Synced db.");
// 	})
// 	.catch((err) => {
// 		console.log("Failed to sync db: " + err.message);
// 	});

lulusan.on("connection", async (socket) => {
	let userId = socket.id;

	socket.on("sync-insert-lulusan", async (data) => {
		let { kd_prodi, ta_lulus } = JSON.parse(data);
		feederToken = await token();

		lulusan
			.to(userId)
			.emit(
				"info",
				JSON.stringify({ message: "Sedang mengambil token" })
			);

		({ error_code, error_desc, data } = feederToken);

		if (error_code == 0) {
			let { token } = data;

			let lulusanData = await ListLulusan(kd_prodi, ta_lulus);

			// send total data to client
			lulusan
				.to(userId)
				.emit(
					"total_lulusan_" + kd_prodi,
					JSON.stringify({ total: lulusanData.length })
				);

			lulusan.to(userId).emit(
				"info",
				JSON.stringify({
					message: "Sedang memproses data, harap tunggu...",
				})
			);

			let i = 1;
			for (let mhs of lulusanData) {
				let { npm, name } = mhs;
				({ error_code, error_desc, data } = await idRegistrasiMahasiswa(
					token,
					npm
				));

				if (error_code == 0) {
					let { id_registrasi_mahasiswa } = data[0];

					const response = await insert(
						token,
						id_registrasi_mahasiswa,
						i,
						mhs
					);

					lulusan
						.to(userId)
						.emit("sync-insert-lulusan", JSON.stringify(response));
				} else {
					lulusan
						.to(userId)
						.emit("error", JSON.stringify({ error: error_desc }));
				}
				i++;
			}
		} else {
			lulusan
				.to(userId)
				.emit("error", JSON.stringify({ error: error_desc }));
		}
	});

	socket.on("disconnect", (reason) => {
		console.log("disconnect reason: " + reason);
	});
});

lulusan.on("error", (err) => {
	console.log(`connect_error due to ${err.message}`);
});

async function insert(token, id_registrasi_mahasiswa, index, mhs) {
	let {
		npm,
		sk_yudisium,
		tgl_yudisium,
		tgl_lulus,
		ta_lulus,
		ipk,
		no_ijazah,
		jdl_skripsi,
		mulai_bim,
		ahir_bim,
		name,
	} = mhs;

	let reqPayload = {
		id_registrasi_mahasiswa: id_registrasi_mahasiswa,
		id_jenis_keluar: "1",
		id_periode_keluar: ta_lulus,
		tanggal_keluar: tgl_lulus,
		keterangan: "",
		nomor_sk_yudisium: sk_yudisium,
		tanggal_sk_yudisium: tgl_yudisium,
		ipk: ipk,
		nomor_ijazah: no_ijazah,
		jalur_skripsi: 1,
		judul_skripsi: jdl_skripsi,
		bulan_awal_bimbingan: mulai_bim,
		bulan_akhir_bimbingan: ahir_bim,
	};

	const data = await insertLulusan(token, reqPayload);
	const response = await sendResponse(index, npm, name, data);

	return response;
}

async function sendResponse(index, npm, name, params) {
	let { error_code, error_desc, data } = params;

	let response = {
		error_code: error_code,
		error_desc: error_desc,
		list: {},
	};

	if (error_code == 0) {
		response.list = {
			order: index,
			npm: npm,
			name: name,
			status: `<span class="badge rounded-pill bg-success " style="font-size:0.8rem !important">Berhasil</span>`,
		};
	} else {
		response.list = {
			order: index,
			npm: npm,
			name: name,
			status: `<span class="badge rounded-pill bg-danger " style="font-size:0.8rem !important">Gagal</span>`,
		};
	}

	return response;
}

async function ListLulusan(kd_prodi, ta_lulus) {
	const users = await db.sequelize.query(GetLulusan, {
		replacements: { kd_prodi: kd_prodi, ta_lulus: ta_lulus },
		type: db.sequelize.QueryTypes.SELECT,
		logging: false,
	});

	return users;
}

module.exports = lulusan;
