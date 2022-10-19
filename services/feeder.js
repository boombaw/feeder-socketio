const fetch = require("node-fetch");
const action = require("../services/commands");
const axios = require("axios");
const redisClient = require("../database/redis/conn");

let url = process.env.FEEDER_HOST;

const token = async () => {
	const token = await redisClient.get("token");

	if (token == null) {
		const data = await getToken();
		const { error_code, error_desc, data: tokenData } = data;

		if (error_code == 0) {
			const { token } = tokenData;
			redisClient.setEx("token", 120, token);
		}

		return data;
	} else {
		return {
			error_code: 0,
			error_desc: "",
			data: { token },
		};
	}
};

const getToken = async () => {
	let username = process.env.FEEDER_USERNAME;
	let password = process.env.FEEDER_PASSWORD;

	let req = {
		act: action.GET_TOKEN,
		username: username,
		password: password,
	};

	return await sendRequest(req);
};

const idRegistrasiMahasiswa = async (token, npm) => {
	const keyRedis = "id_registrasi_mahasiswa_" + npm;

	let id_registrasi_mahasiswa = await redisClient.get(keyRedis);

	if (id_registrasi_mahasiswa == null) {
		const data = await getIdRegistrasiMahasiswa(token, npm);
		const { error_code, error_desc, data: idRegistrasiData } = data;

		if (error_code == 0) {
			({ id_registrasi_mahasiswa } = idRegistrasiData[0]);
			redisClient.setEx(keyRedis, 600, id_registrasi_mahasiswa);
		}

		return data;
	} else {
		return {
			error_code: 0,
			error_desc: "",
			data: [{ id_registrasi_mahasiswa }],
		};
	}
};

const getIdRegistrasiMahasiswa = async (token, npm) => {
	let req = {
		act: action.GET_RIWAYAT_PENDIDIKAN_MHS,
		token: token,
		filter: `nim ~* '${npm}' order by id_periode_masuk desc`,
		limit: 1,
	};

	return await sendRequest(req);
};

const insertLulusan = async (token, data) => {
	let req = {
		act: action.INSERT_LULUS_DO,
		token: token,
		record: data,
	};

	return await sendRequest(req);
};

const insertDOFeeder = async (token, params) => {
	let req = {
		act: action.INSERT_LULUS_DO,
		token: token,
		record: params,
	};

	// console.log(JSON.stringify(req));

	return await sendRequest(req);
};

const getStatusAKM = async (token, npm, semester) => {
	let filter = ` nim ~* '${npm}' and id_semester ~* '${semester}'`;
	let req = {
		act: action.GET_AKM,
		token: token,
		filter: filter,
	};

	return await sendRequest(req);
};

const getLastAKMFeeder = async (token, npm, sms_prodi) => {
	let filter = ` nim ~* '${npm}' and id_prodi = '${sms_prodi}' order by id_periode_masuk DESC`;
	let req = {
		act: action.GET_LIST_KULIAH_MHS,
		token: token,
		filter: filter,
		limit: 1,
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
		token: token,
		key: key,
		record: record,
	};

	return await sendRequest(req);
};

const insertCutiFeeder = async (token, params) => {
	let req = {
		act: action.INSERT_LIST_KULIAH_MHS,
		token: token,
		record: params,
	};

	return await sendRequest(req);
};

const sendRequest = async (req) => {
	try {
		let response = await axios({
			method: "post",
			url: url,
			data: req,
		});

		const data = await response.data;
		return data;
	} catch (error) {
		console.log("Error Send Request : ", error);
		return error;
	}
};

module.exports = {
	token,
	idRegistrasiMahasiswa,
	insertLulusan,
	getStatusAKM,
	updateAkmFeeder,
	getLastAKMFeeder,
	insertCutiFeeder,
	insertDOFeeder,
};
