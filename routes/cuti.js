const { io } = require("../websocket");
const db = require("../database/mysql/conn");

const {
	token,
	getLastAKMFeeder,
	insertCutiFeeder,
} = require("../services/feeder");

const { SELECT_CUTI } = require("../database/query/query");

const cuti = io.of("/cuti");

cuti.on("connection", async (socket) => {
	const userId = socket.id;

	socket.on("insert-cuti", async (data) => {
		console.log(data);
		let { kd_prodi, tahun, sms } = JSON.parse(data);

		feederToken = await token();
		cuti.to(userId).emit(
			"info",
			JSON.stringify({ message: "Sedang mengambil token" })
		);
		({ error_code, error_desc, data } = feederToken);
		if (error_code == 0) {
			let { token } = data;
			let cutiData = await ListCuti(kd_prodi, tahun);

			cuti.to(userId).emit(
				"total_cuti_" + kd_prodi,
				JSON.stringify({ total: cutiData.length })
			);

			for (let i = 0; i < cutiData.length; i++) {
				let { npm, name, index_biaya } = cutiData[i];

				const response = await InsertCuti(
					token,
					npm,
					name,
					i + 1,
					index_biaya,
					tahun,
					sms
				);

				({ error_code, error_desc } = response);

				if (!response.hasOwnProperty("list") && error_code > 0) {
					cuti.to(userId).emit(
						"error",
						JSON.stringify({ error: error_desc })
					);
				} else {
					cuti.to(userId).emit(
						"insert-cuti",
						JSON.stringify(response)
					);
				}
			}
		} else {
			cuti.to(userId).emit(
				"error",
				JSON.stringify({ error: error_desc })
			);
		}
	});
});

cuti.on("error", async () => {
	console.log(`connect_error due to ${err.message}`);
});

cuti.on("disconnect", async () => {
	console.log(`disconnect due to ${reason}`);
});

// Get data from database
async function ListCuti(kd_prodi, tahun) {
	let data = await db.sequelize.query(SELECT_CUTI, {
		replacements: { kd_prodi: kd_prodi, tahun: tahun },
		type: db.sequelize.QueryTypes.SELECT,
		logging: true,
	});
	return data;
}

async function InsertCuti(token, npm, name, index, biaya, tahun, sms) {
	let dataCuti = await getLastAKMFeeder(token, npm, sms);
	let response = {};

	let { error_code, error_desc, data } = dataCuti;
	if (error_code == 0) {
		let { id_registrasi_mahasiswa, ipk, sks_total } = data.shift();
		let arg = {
			id_semester: tahun,
			id_registrasi_mahasiswa: id_registrasi_mahasiswa,
			id_status_mahasiswa: "C",
			ips: 0,
			ipk: ipk,
			sks_semester: 0,
			total_sks: parseInt(sks_total).toFixed(2),
			biaya_kuliah_smt: parseInt(biaya),
		};

		({ error_code, error_desc, data } = await insertCutiFeeder(token, arg));
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
module.exports = cuti;
