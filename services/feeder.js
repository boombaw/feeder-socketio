const axios = require("axios");
const action = require("./commands");
const redisClient = require("../database/redis/conn");

let url = process.env.FEEDER_HOST;

const sendRequest = async (req) => {
	try {
		let response = await axios({
			method: "post",
			url,
			data: req,
		});

		return await response.data;
	} catch (error) {
		console.log("Error Send Request : ", error);
		return error;
	}
};

const getToken = async () => {
	let username = process.env.FEEDER_USERNAME;
	let password = process.env.FEEDER_PASSWORD;

	let req = {
		act: action.GET_TOKEN,
		username,
		password,
	};

	return await sendRequest(req);
};

const token = async () => {
	const token = await redisClient.get("token");

	if (token === null) {
		const data = await getToken();
		const { error_code, data: tokenData } = data;

		if (error_code === 0) {
			const { token } = tokenData;
			redisClient.setEx("token", 50, token);
		}

		return data;
	}
	return {
		error_code: 0,
		error_desc: "",
		data: { token },
	};
};

const refreshToken = async () => {
	const data = await getToken();
	const { error_code, data: tokenData } = data;

	if (error_code === 0) {
		const { token } = tokenData;
		redisClient.setEx("token", 60, token);
	}

	return data;
};

const getIdRegistrasiDosen = async (token, args) => {
	let filter = `id_dosen = '${args.id_dosen.trim()}' and id_tahun_ajaran ='${args.tahun.substring(
		0,
		4
	)}' order by id_tahun_ajaran desc`;

	let req = {
		token,
		act: action.GET_PENUGASAN_DOSEN,
		filter,
	};

	return await sendRequest(req);
};

const idRegistrasiDosen = async (token, args) => {
	let keyRedis = `id_registrasi_dosen_${args.id_dosen}_${args.tahun}`;
	const idRegis = await redisClient.get(keyRedis);

	if (idRegis === null) {
		const data = await getIdRegistrasiDosen(token, args);

		const { error_code, data: idRegistrasiData } = data;

		if (error_code === 0 && idRegistrasiData.length > 0) {
			let { id_registrasi_dosen } = idRegistrasiData[0];
			redisClient.setEx(keyRedis, 600, id_registrasi_dosen);
			return id_registrasi_dosen;
		}

		return null;
	} else {
		return idRegis;
	}
};

const getIdRegistrasiMahasiswa = async (token, npm) => {
	try {
		let req = {
			act: action.GET_RIWAYAT_PENDIDIKAN_MHS,
			token,
			filter: `nim ~* '${npm}' order by id_periode_masuk desc`,
			limit: 1,
		};
		return await sendRequest(req);
	} catch (error) {
		return {
			error_code: 5,
			error_desc: error.message,
			data: [],
		};
	}
};

const idRegistrasiMahasiswa = async (token, npm) => {
	const keyRedis = `id_registrasi_mahasiswa_${npm}`;

	let id_registrasi_mahasiswa = await redisClient.get(keyRedis);

	if (id_registrasi_mahasiswa === null) {
		const data = await getIdRegistrasiMahasiswa(token, npm);

		const { error_code, data: idRegistrasiData } = data;

		if (error_code === 0 && data.length > 0) {
			let { id_registrasi_mahasiswa } = idRegistrasiData[0];
			redisClient.setEx(keyRedis, 600, id_registrasi_mahasiswa);
		}

		return data;
	}
	return {
		error_code: 0,
		error_desc: "",
		data: [{ id_registrasi_mahasiswa }],
	};
};

const insertLulusan = async (token, data) => {
	let req = {
		act: action.INSERT_LULUS_DO,
		token,
		record: data,
	};

	return await sendRequest(req);
};

const insertDOFeeder = async (token, params) => {
	let req = {
		act: action.INSERT_LULUS_DO,
		token,
		record: params,
	};

	return await sendRequest(req);
};

const insertNAFeeder = async (token, params) => {
	let req = {
		act: action.INSERT_LIST_KULIAH_MHS,
		token,
		record: params,
	};
	return await sendRequest(req);
};

const getStatusAKM = async (token, npm, semester) => {
	let filter = ` nim ~* '${npm}' and id_semester ~* '${semester}'`;
	let req = {
		act: action.GET_AKM,
		token,
		filter,
	};

	return await sendRequest(req);
};

const getLastAKMFeeder = async (token, npm, sms_prodi) => {
	let filter = ` nim ~* '${npm}' and id_prodi = '${sms_prodi}' order by id_periode_masuk DESC`;
	let req = {
		act: action.GET_LIST_KULIAH_MHS,
		token,
		filter,
		limit: 1,
	};

	return await sendRequest(req);
};

const insertAkmFeeder = async (token, arg) => {
	let record = {
		id_registrasi_mahasiswa: arg.id_registrasi_mahasiswa,
		id_semester: arg.semester,
		id_status_mahasiswa: arg.id_status_mahasiswa,
		ips: arg.ips,
		ipk: arg.ipk,
		sks_semester: arg.sks,
		total_sks: arg.total_sks,
		biaya_kuliah_smt: arg.biaya,
	};

	let req = {
		act: action.INSERT_LIST_KULIAH_MHS,
		token,
		record,
	};

	return await sendRequest(req);
};

const updateAkmFeeder = async (token, arg) => {
	let key = {
		id_registrasi_mahasiswa: arg.id_registrasi_mahasiswa,
		id_semester: arg.semester,
	};

	let record = {
		id_status_mahasiswa: arg.id_status_mahasiswa,
		ips: arg.ips,
		ipk: arg.ipk,
		sks_semester: arg.sks,
		total_sks: arg.total_sks,
		biaya_kuliah_smt: arg.biaya,
	};

	let req = {
		act: action.UPDATE_LIST_KULIAH_MHS,
		token,
		key,
		record,
	};

	return await sendRequest(req);
};

const insertCutiFeeder = async (token, params) => {
	let req = {
		act: action.INSERT_LIST_KULIAH_MHS,
		token,
		record: params,
	};

	return await sendRequest(req);
};

const getBio = async (token, nik, nama) => {
	let filter = `nik like '%${nik}%'`;
	filter += ` and nama_mahasiswa like '%${nama}%'`;
	let req = {
		act: action.GET_BIODATA_MHS,
		token,
		filter,
	};

	try {
		return await sendRequest(req);
	} catch (error) {
		console.log(error);
	}
};

const insertBio = async (token, args) => {
	let req = {
		token,
		act: action.INSERT_BIODATA_MHS,
		record: args,
	};

	return await sendRequest(req);
};
const updateBio = async (token, id_mahasiswa, args) => {
	let req = {
		token,
		act: action.UPDATE_BIODATA_MHS,
		key: {
			id_mahasiswa,
		},
		record: args,
	};

	return await sendRequest(req);
};

const syncBioMaba = async (token, npm, nama, params) => {
	const bio = await getBio(token, params.nik, nama);

	let { error_code, error_desc, data } = bio;
	if (error_code === 0) {
		if (data.length > 0) {
			let { id_mahasiswa } = data[0];
			return await updateBio(token, id_mahasiswa, params);
		} else {
			return await insertBio(token, params);
		}
	} else {
		return bio;
	}
};

const insertRiwayatPendidikan = async (token, params) => {
	let req = {
		token,
		act: action.INSERT_RIWAYAT_PENDIDIKAN_MHS,
		record: params,
	};

	return await sendRequest(req);
};

const updateRiwayatPendidikan = async (token,key, params) => {
	let req = {
		token,
		act: action.UPDATE_RIWAYAT_PENDIDIKAN_MHS,
		key : {id_registrasi_mahasiswa : key},
		record: params,
	};

	return await sendRequest(req);
};

const getMatakuliahFeeder = async (token, kd_matakuliah, id_sms) => {
	let filter = `id_prodi = '${id_sms}' and kode_mata_kuliah = '${kd_matakuliah}'`;

	let req = {
		token,
		filter,
		act: action.GET_LIST_MATAKULIAH,
	};
	return await sendRequest(req);
};

const syncInsertKelasKuliah = async (token, params) => {
	let req = {
		token,
		act: action.INSERT_KELAS,
		record: params,
	};

	return await sendRequest(req);
};

const syncUpdateKelasKuliah = async (token, params, key) => {
	let req = {
		token,
		key,
		act: action.UPDATE_KELAS,
		record: params,
	};

	return await sendRequest(req);
};

const getListKelas = async (token, args) => {
	let filter = `kode_mata_kuliah = '${args.kode_mata_kuliah}' and nama_kelas_kuliah = '${args.nama_kelas_kuliah}' and id_prodi = '${args.sms}'`;
	filter += ` and id_semester = '${args.tahun}'`;

	let req = {
		token,
		act: action.GET_DETAIL_KELAS,
		filter,
	};

	return await sendRequest(req);
};

const getListKelasCahe = async (token, args) => {
	let keyRedis = `kelas_${args.sms}_${args.kd_jadwal}`;

	let id_kelas_kuliah = await redisClient.get(keyRedis);
	if (id_kelas_kuliah === null) {
		let filter = `kode_mata_kuliah = '${args.kode_mata_kuliah}' and nama_kelas_kuliah = '${args.nama_kelas_kuliah}' and id_prodi = '${args.sms}'`;
		filter += ` and id_semester = '${args.tahun}'`;

		let req = {
			token,
			act: action.GET_DETAIL_KELAS,
			filter,
		};

		const data = await sendRequest(req);

		let { error_code, error_desc, data: list } = data;
		if (error_code !== 0) {
			return null;
		} else {
			// set redis
			// 259200 = 3 hari
			try {
				let { id_kelas_kuliah } = list[0];
				const [setKeyReply] = await redisClient
					.multi()
					.setEx(keyRedis, 259200, id_kelas_kuliah)
					.get(keyRedis)
					.exec();

				if (setKeyReply === "OK") {
					return id_kelas_kuliah;
				} else {
					return null;
				}
			} catch (error) {
				return null;
			}
		}
	} else {
		return id_kelas_kuliah;
	}
};

const insertPesertaKelas = async (token, args) => {
	let req = {
		token,
		act: action.INSERT_PESERTA_KELAS,
		record: args,
	};

	return await sendRequest(req);
};

const getIDDosen = async (token, args) => {
	let filter = `nidn = '${args.nidn.replace(/\s/g, "")}'`;
	let req = {
		token,
		act: action.GET_LIST_DOSEN,
		filter,
	};

	return await sendRequest(req);
};

const getDosenPengajar = async (token, params) => {
	let req = {
		token,
		act: action.GET_DOSEN_PENGAJAR,
		filter: `id_kelas_kuliah = '${params.id_kelas_kuliah}' and id_registrasi_dosen = '${params.id_registrasi_dosen}'`,
	};

	return await sendRequest(req);
};

const InsertDosenPengajar = async (token, record) => {
	let req = {
		token: token,
		act: action.INSERT_DOSEN_PENGAJAR,
		record,
	};

	return await sendRequest(req);
};

const UpdateDosenPengajar = async (token, record, key) => {
	let req = {
		token,
		act: action.UPDATE_DOSEN_PENGAJAR,
		key,
		record,
	};

	return await sendRequest(req);
};

const UpdateNilaiPerkuliahan = async (token, record, key) => {
	try {
		let req = {
			token,
			act: action.UPDATE_NILAI_KELAS,
			key,
			record,
		};

		return await sendRequest(req);
	} catch (error) {
		return {
			error_code: 5,
			error_desc: error.message,
			data: [],
		};
	}
};

module.exports = {
	token,
	idRegistrasiMahasiswa,
	insertLulusan,
	getStatusAKM,
	insertAkmFeeder,
	updateAkmFeeder,
	getLastAKMFeeder,
	insertCutiFeeder,
	insertDOFeeder,
	insertNAFeeder,
	syncBioMaba,
	refreshToken,
	insertRiwayatPendidikan,
	getMatakuliahFeeder,
	getListKelas,
	syncInsertKelasKuliah,
	syncUpdateKelasKuliah,
	insertPesertaKelas,
	getListKelasCahe,
	getIDDosen,
	idRegistrasiDosen,
	getDosenPengajar,
	InsertDosenPengajar,
	UpdateDosenPengajar,
	UpdateNilaiPerkuliahan,
	updateRiwayatPendidikan
};
