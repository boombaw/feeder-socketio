const fetch = require("node-fetch");
const action = require("../services/commands");
const axios = require("axios");
// const redisClient = require("../database/redis/conn");

let url = process.env.FEEDER_HOST;

const token = async () => {
	// const token = await redisClient.get("feeder", (err, result) => {
	// 	if (err) {
	// 		console.log(err);
	// 	}
	// 	console.log(result);
	// });
	// console.log(token);

	let username = process.env.FEEDER_USERNAME;
	let password = process.env.FEEDER_PASSWORD;

	let req = {
		act: action.GET_TOKEN,
		username: username,
		password: password,
	};

	try {
		let response = await axios({
			method: "post",
			url: url,
			data: req,
		});

		const data = await response.data;
		return data;
	} catch (error) {
		console.log(error);
		return error;
	}
};

const idRegistrasiMahasiswa = async (token, npm) => {
	let req = {
		act: action.GET_RIWAYAT_PENDIDIKAN_MHS,
		token: token,
		filter: `nim ~* '${npm}' order by id_periode_masuk desc`,
	};

	try {
		let response = await axios({
			method: "post",
			url: url,
			data: req,
		});

		const data = await response.data;
		return data;
	} catch (error) {
		console.log("GET ID Registrasi ", error);
		return error;
	}
};

const insertLulusan = async (token, data) => {
	let req = {
		act: action.INSERT_LULUS_DO,
		token: token,
		record: data,
	};

	try {
		let response = await axios({
			method: "post",
			url: url,
			data: req,
		});

		const data = await response.data;
		return data;
	} catch (error) {
		console.log("Error insert lulusan : ", error);
		return error;
	}
};

module.exports = { token, idRegistrasiMahasiswa, insertLulusan };
