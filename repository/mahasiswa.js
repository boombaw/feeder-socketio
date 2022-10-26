const { db } = require("../database/mysql/conn");

class Mahasiswa {
	constructor() {}

	async getProdiMhs(npm) {
		let sqlQuery = `SELECT
                            tm.KDPSTMSMHS AS kd_prodi
                        FROM
                            tbl_mahasiswa WHERE NIMHSMSMHS = :npm
                        LIMIT 1`;

		const data = await db.sequelize.query(sqlQuery, {
			replacements: {
				npm,
			},
			type: db.sequelize.QueryTypes.SELECT,
			logging: false,
			plain: true,
		});

		return data;
	}
}

module.exports = Mahasiswa;
