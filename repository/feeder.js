const { db, databaseMaba } = require("../database/mysql/conn");

class Feeder {
	constructor() {}

	async jalurMaba(no_ujian) {
		let sqlQuery = `SELECT id_jalur FROM peembe.pendaftar p where p.no_ujian = :no_ujian`;
		let data = await databaseMaba.query(sqlQuery, {
			replacements: {
				no_ujian,
			},
			type: databaseMaba.QueryTypes.SELECT,
			raw: true,
			plain: true,
			logging: false,
		});

		if (data === null) {
			return null;
		} else {
			let { id_jalur } = await data;
			return id_jalur;
		}
	}

	async tanggalDaftar(no_ujian) {
		// let sqlQuery = `SELECT time_insert tgl_daftar FROM pendaftar p WHERE p.no_ujian  = :no_ujian`;
		// let data = await databaseMaba.query(sqlQuery, {
		// 	replacements: {
		// 		no_ujian,
		// 	},
		// 	type: databaseMaba.QueryTypes.SELECT,
		// 	raw: true,
		// 	plain: true,
		// 	logging: false,
		// });

		// if (data === null) {
		// 	return null;
		// } else {
		// 	let { tgl_daftar } = await data;

		// 	var date = new Date(tgl_daftar);
		// 	var newDate = new Date(
		// 		date.getTime() - date.getTimezoneOffset() * 60000
		// 	)
		// 		.toISOString()
		// 		.split("T")[0];

		// 		// return newDate;
		// 	}
		return "2022-09-12"; //request kordinator feeder
	}

	async bayarMaba(kd_prodi, kelasMaba, jalurMaba) {
		let sqlQuery = `SELECT
                            tahunajaran ta
                        FROM
                            siakadonline.tbl_tahunajaran tt
                        ORDER BY
                            id_tahunajaran DESC `;

		let tahun = await db.sequelize.query(sqlQuery, {
			type: db.sequelize.QueryTypes.SELECT,
			raw: true,
			plain: true,
			logging: false,
		});

		let ta = tahun.ta;

		sqlQuery = `SELECT
                        a.nominal
                    from
                        peembe.tbl_indeks_harga as a
                    LEFT JOIN
                        peembe.gelombang as b
                    on
                        a.indeks_gelombang = b.indeks
                    WHERE
                        a.kode_prodi= :kd_prodi
                    AND
                        a.kelas = :kelas
                    AND
                        a.ta = :ta
                    AND
                        b.id_jalur = :id_jalur
                    AND
                        a.jenis_pembayarannya = '2'
                    GROUP BY
                        a.jenis_pembayarannya`;
		let bayar = await databaseMaba.query(sqlQuery, {
			replacements: {
				kd_prodi,
				ta,
				kelas: kelasMaba,
				id_jalur: jalurMaba,
			},
			type: databaseMaba.QueryTypes.SELECT,
			raw: true,
			plain: true,
			logging: false,
		});

		if (bayar === null) {
			return 0;
		} else {
			let { nominal } = await bayar;
			return nominal;
		}
	}

	async sksDiakui(npm) {
		let sqlQuery = `SELECT
							sum(tmn.sks_matakuliah)  sks_diakui
						FROM
							tbl_transaksi_nilai_konversi ttnk
						JOIN tbl_matakuliah_neww tmn  on
							tmn.kd_matakuliah = ttnk.KDKMKTRLNM 
						WHERE
							NIMHSTRLNM = :npm`;
		let data = await db.sequelize.query(sqlQuery, {
			replacements: {
				npm,
			},
			type: db.sequelize.QueryTypes.SELECT,
			raw: true,
			plain: true,
			logging: false,
		});

		if (data === null) {
			return 0;
		} else {
			let { sks_diakui } = await data;
			return sks_diakui;
		}
	}

	async ptKonversi(npm) {
		let sqlQuery = `SELECT
							id_pt_asal ,
							id_prodi_asal 
						FROM
							tbl_pt_asal_konversi
						WHERE
							npm_mahasiswa = :npm`;

		let data = await db.sequelize.query(sqlQuery, {
			replacements: {
				npm,
			},
			type: db.sequelize.QueryTypes.SELECT,
			raw: true,
			plain: true,
			logging: false,
		});

		if (data === null) {
			return {
				id_pt_asal: null,
				id_prodi_asal: null,
			};
		} else {
			return data;
		}
	}

	async smsProdi(kd_prodi) {
		let sqlQuery = `SELECT
							id_sms
						FROM
							tbl_jurusan_prodi
						WHERE
							kd_prodi = :kd_prodi`;

		let data = await databaseMaba.query(sqlQuery, {
			replacements: {
				kd_prodi,
			},
			type: databaseMaba.QueryTypes.SELECT,
			raw: true,
			plain: true,
			logging: false,
		});

		if (data === null) {
			return 0;
		} else {
			let { id_sms } = await data;
			return id_sms;
		}
	}
}

module.exports = Feeder;
