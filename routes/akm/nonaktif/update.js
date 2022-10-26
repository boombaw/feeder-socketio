/* eslint-disable no-console */
const { io } = require("../../../websocket");
const { db } = require("../../../database/mysql/conn");

const {
	token,
	idRegistrasiMahasiswa,
	updateAkmFeeder,
} = require("../../../services/feeder");
const { statusMhs, studyStart } = require("../../../util/helper");
const {
	SELECT_AKM_NA,
	SelectLastAKM,
} = require("../../../database/query/query");

const updateAKMNA = io.of("/update-akm-na");

// Get data from database
async function ListNonAktif(kd_prodi, tahun) {
	const study_start = studyStart(tahun);

	const data = await db.sequelize.query(SELECT_AKM_NA, {
		replacements: {
			kd_prodi,
			tahun,
			study_start,
		},
		type: db.sequelize.QueryTypes.SELECT,
		logging: false,
	});

	return data;
}

async function LastAKM(npm) {
	const data = await db.sequelize.query(SelectLastAKM, {
		replacements: {
			npm,
		},
		type: db.sequelize.QueryTypes.SELECT,
		logging: false,
	});

	return data.shift();
}

async function UpdateNA(
	name,
	npm,
	semester,
	ipk,
	ips,
	sks,
	total_sks,
	biaya,
	tokenFeeder,
	index
) {
	const response = {};

	let { error_code, error_desc, data } = await idRegistrasiMahasiswa(
		tokenFeeder,
		npm
	);

	if (error_code === 0) {
		// get id registrasi mahasiswa from feeder
		const { id_registrasi_mahasiswa } = data.shift();

		ips = parseFloat(ips).toFixed(2);
		ipk = parseFloat(ipk).toFixed(2);
		sks = parseFloat(sks);
		total_sks = parseFloat(total_sks);
		biaya = parseInt(biaya, 10);

		const arg = {
			ips,
			ipk,
			sks,
			total_sks,
			biaya,
			id_registrasi_mahasiswa,
			id_status_mahasiswa: statusMhs.nonAktif,
			semester,
		};

		// update akm to feeder
		({ error_code, error_desc, data } = await updateAkmFeeder(
			tokenFeeder,
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

	response.error_code = error_code;
	response.error_desc = error_desc;

	return response;
}

updateAKMNA.on("connection", async (socket) => {
	const userId = socket.id;

	socket.on("update-akm-na", async (data) => {
		const { kd_prodi, tahun } = JSON.parse(data);

		let feederToken = await token();
		updateAKMNA
			.to(userId)
			.emit(
				"info",
				JSON.stringify({ message: "Sedang mengambil token" })
			);

		let { error_code, error_desc, data: dataToken } = feederToken;
		if (error_code === 0) {
			const { token: tokenFeeder } = dataToken;

			const nonAktifData = await ListNonAktif(kd_prodi, tahun);

			// send total data to client
			updateAKMNA
				.to(userId)
				.emit(
					"total_update_akm_na_" + kd_prodi,
					JSON.stringify({ total: nonAktifData.length })
				);

			for (let i = 0; i < nonAktifData.length; i++) {
				const { name, npm } = nonAktifData[i];
				const akm = await LastAKM(npm);
				const { ips, ipk, sks, total_sks, biaya } = akm;

				const response = await UpdateNA(
					name,
					npm,
					tahun,
					ipk,
					ips,
					sks,
					total_sks,
					biaya,
					tokenFeeder,
					i + 1
				);

				({ error_code, error_desc } = response);
				const has = Object.prototype.hasOwnProperty;
				if (has.call(response, "list") && error_code > 0) {
					updateAKMNA
						.to(userId)
						.emit("error", JSON.stringify({ error: error_desc }));
				} else {
					updateAKMNA
						.to(userId)
						.emit("update-akm-na", JSON.stringify(response));
				}
			}
		} else {
			updateAKMNA
				.to(userId)
				.emit("error", JSON.stringify({ error: error_desc }));
		}
	});
});

updateAKMNA.on("error", async (err) => {
	console.log(`connect_error due to ${err.message}`);
});

updateAKMNA.on("disconnect", async (reason) => {
	console.log(`disconnect due to ${reason}`);
});

module.exports = updateAKMNA;
