/* eslint-disable no-console */
const { io } = require("../../../websocket");
const { db } = require("../../../database/mysql/conn");
const { SELECT_AKM } = require("../../../database/query/query");

const {
	token,
	getStatusAKM,
	idRegistrasiMahasiswa,
	updateAkmFeeder,
} = require("../../../services/feeder");

const updateAKM = io.of("/update-akm");

// Get data from database
async function ListAKM(kd_prodi, tahun) {
	let data = await db.sequelize.query(SELECT_AKM, {
		replacements: { kd_prodi, tahun },
		type: db.sequelize.QueryTypes.SELECT,
		logging: false,
	});

	return data;
}

async function UpdateAKM(
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
	// get status akm from feeder
	const status = await getStatusAKM(token, npm, semester);

	let response = {};

	// destructing data status
	let { error_code, error_desc, data } = status;

	if (error_code === 0) {
		let { id_status_mahasiswa } = data.shift();

		// get riwayat pendidikan mahasiswa from feeder
		// destructing data riwayat pendidikan mahasiswa
		({ error_code, error_desc, data } = await idRegistrasiMahasiswa(
			token,
			npm
		));

		if (error_code === 0) {
			// get id registrasi mahasiswa from feeder
			let { id_registrasi_mahasiswa } = data.shift();

			ips = parseFloat(ips).toFixed(2);
			ipk = parseFloat(ipk).toFixed(2);
			sks = parseFloat(sks);
			total_sks = parseFloat(total_sks);
			biaya = parseInt(biaya, 10);

			let arg = {
				ips,
				ipk,
				sks,
				total_sks,
				biaya,
				id_registrasi_mahasiswa,
				id_status_mahasiswa,
				semester,
			};

			// update akm to feeder
			({ error_code, error_desc, data } = await updateAkmFeeder(
				token,
				arg
			));

			if (error_code === 0) {
				response.list = {
					order: index,
					npm,
					name,
					status: '<span class="badge rounded-pill bg-success " style="font-size:0.8rem !important">Berhasil</span>',
				};
			} else {
				response.list = {
					order: index,
					npm,
					name,
					status: '<span class="badge rounded-pill bg-danger " style="font-size:0.8rem !important">Gagal</span>',
				};
			}
		}
	}

	response.error_code = error_code;
	response.error_desc = error_desc;

	return response;
}

updateAKM.on("connection", async (socket) => {
	let userId = socket.id;

	socket.on("update-akm", async (data) => {
		let { kd_prodi, tahun } = JSON.parse(data);

		const feederToken = await token();
		updateAKM
			.to(userId)
			.emit(
				"info",
				JSON.stringify({ message: "Sedang mengambil token" })
			);

		let { error_code, error_desc, data: dataToken } = feederToken;
		if (error_code === 0) {
			let { token } = dataToken;
			let akmData = await ListAKM(kd_prodi, tahun);

			// send total data to client
			updateAKM
				.to(userId)
				.emit(
					`total_update_akm_${kd_prodi}`,
					JSON.stringify({ total: akmData.length })
				);

			for (let i = 0; i < akmData.length; i++) {
				let { npm, name, ipk, ips, sks, total_sks, biaya } = akmData[i];

				const response = await UpdateAKM(
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

				if (
					!Object.prototype.hasOwnProperty.call(response, "list") &&
					error_code > 0
				) {
					updateAKM
						.to(userId)
						.emit("error", JSON.stringify({ error: error_desc }));
				} else {
					updateAKM
						.to(userId)
						.emit("update-akm", JSON.stringify(response));
				}
			}
		} else {
			updateAKM
				.to(userId)
				.emit("error", JSON.stringify({ error: error_desc }));
		}
	});
});

updateAKM.on("error", async (err) => {
	console.log(`connect_error due to ${err.message}`);
});

updateAKM.on("disconnect", async (reason) => {
	console.log(`disconnect due to ${reason}`);
});

module.exports = updateAKM;
