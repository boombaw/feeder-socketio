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
			redisClient.setEx("token", 60, token);
		}

		return data;
	}
	return {
		error_code: 0,
		error_desc: "",
		data: { token },
	};
};

const getIdRegistrasiMahasiswa = async (token, npm) => {
	let req = {
		act: action.GET_RIWAYAT_PENDIDIKAN_MHS,
		token,
		filter: `nim ~* '${npm}' order by id_periode_masuk desc`,
		limit: 1,
	};

	return await sendRequest(req);
};

const idRegistrasiMahasiswa = async (token, npm) => {
	const keyRedis = `id_registrasi_mahasiswa_${npm}`;

	let id_registrasi_mahasiswa = await redisClient.get(keyRedis);

	if (id_registrasi_mahasiswa === null) {
		const data = await getIdRegistrasiMahasiswa(token, npm);

		const { error_code, data: idRegistrasiData } = data;

		if (error_code === 0) {
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
};
