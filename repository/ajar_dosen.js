const { db } = require("../database/mysql/conn");

class AjarDosen {
	constructor() {}

	async getJadwalDosen(kd_jadwal) {
		let sqlQuery = `SELECT
                            tbd.nid ,
                            tbd.nidn ,
                            tbd.nupn ,
                            tbd.nama ,
                            tbd.nidk ,
                            tjm.kd_jadwal ,
							tm.nama_matakuliah,
                            tjm.kd_matakuliah ,
                            tjm.kelas ,
                            tjm.kd_tahunajaran,
                            tm.sks_matakuliah,
							tjm.id_kelas_kuliah_feeder as id_kelas_kuliah
                        FROM
                            tbl_jadwal_matkul tjm
                            join tbl_matakuliah_neww tm on tm.id_matakuliah = tjm.id_matakuliah
                            JOIN tbl_biodata_dosen tbd ON tbd.nid = tjm.kd_dosen
                        WHERE
                            tjm.kd_jadwal = :kd_jadwal `;
		let data = await db.sequelize.query(sqlQuery, {
			replacements: {
				kd_jadwal,
			},
			type: db.sequelize.QueryTypes.SELECT,
			raw: true,
			// plain: true,
			logging: false,
		});

		if (data === null) {
			return null;
		} else {
			return data;
		}
	}
}

module.exports = AjarDosen;
