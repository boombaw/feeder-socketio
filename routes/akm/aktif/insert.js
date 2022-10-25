const { io } = require("../../../websocket");
const { db } = require("../../../database/mysql/conn");
const { SELECT_AKM } = require("../../../database/query/query");

const {
	token,
	idRegistrasiMahasiswa,
	updateAkmFeeder,
} = require("../../../services/feeder");
const { statusMhs } = require("../../../util/helper");

const insertAKM = io.of("/insert-akm");

insertAKM.on("connection", async (socket) => {
	let userId = socket.id;

	socket.on("insert-akm", async (data) => {
		let { kd_prodi, tahun } = JSON.parse(data);

		feederToken = await token();
		insertAKM
			.to(userId)
			.emit(
				"info",
				JSON.stringify({ message: "Sedang mengambil token" })
			);

		({ error_code, error_desc, data } = feederToken);
		if (error_code == 0) {
			let { token } = data;
			let akmData = await ListAKM(kd_prodi, tahun);

			// send total data to client
			insertAKM
				.to(userId)
				.emit(
					"total_insert_akm_" + kd_prodi,
					JSON.stringify({ total: akmData.length })
				);

			for (let i = 0; i < akmData.length; i++) {
				let { npm, name, ipk, ips, sks, total_sks, biaya } = akmData[i];

				const response = await insertAKMAktif(
					name,
					npm,
					tahun,
					ipk,
					ips,
					sks,
					total_sks,
					biaya,
					token,
					i + 1
				);

				({ error_code, error_desc } = response);

				if (!response.hasOwnProperty("list") && error_code > 0) {
					insertAKM
						.to(userId)
						.emit("error", JSON.stringify({ error: error_desc }));
				} else {
					insertAKM
						.to(userId)
						.emit("insert-akm", JSON.stringify(response));
				}
			}
		} else {
			insertAKM
				.to(userId)
				.emit("error", JSON.stringify({ error: error_desc }));
		}
	});
});

insertAKM.on("error", async (err) => {
	console.log(`connect_error due to ${err.message}`);
});

insertAKM.on("disconnect", async (reason) => {
	console.log(`disconnect due to ${reason}`);
});

// Get data from database
async function ListAKM(kd_prodi, tahun) {
	let data = await db.sequelize.query(SELECT_AKM, {
		replacements: { kd_prodi: kd_prodi, tahun: tahun },
		type: db.sequelize.QueryTypes.SELECT,
		logging: false,
	});

	return data;
}

async function insertAKMAktif(
	name,
	npm,
	semester,
	ipk,
	ips,
	sks,
	total_sks,
	biaya,
	token,
	index
) {
	let response = {};

	// get riwayat pendidikan mahasiswa from feeder
	// destructing data riwayat pendidikan mahasiswa
	let { error_code, error_desc, data } = await idRegistrasiMahasiswa(
		token,
		npm
	);

	if (error_code == 0) {
		// get id registrasi mahasiswa from feeder
		let { id_registrasi_mahasiswa } = data.shift();

		ips = parseFloat(ips).toFixed(2);
		ipk = parseFloat(ipk).toFixed(2);
		sks = parseFloat(sks);
		total_sks = parseFloat(total_sks);
		biaya = parseInt(biaya);

		let arg = {
			ips,
			ipk,
			sks,
			total_sks,
			sks,
			biaya,
			id_registrasi_mahasiswa,
			id_status_mahasiswa: statusMhs.aktif,
			semester,
		};

		// update akm to feeder
		({ error_code, error_desc, data } = await insertAkmFeeder(token, arg));

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
	}

	response.error_code = error_code;
	response.error_desc = error_desc;

	return response;
}

module.exports = insertAKM;
