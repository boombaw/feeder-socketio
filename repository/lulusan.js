const { db } = require("../database/mysql/conn");

class LulusanRepo {
	constructor() {}

	async updateStatusSync(npm) {
		const sqlQuery = `UPDATE tbl_lulusan SET has_sync = 1 WHERE npm_mahasiswa :npm`;
		const data = await db.sequelize.query(sqlQuery, {
			replacements: {
				npm,
			},
			type: db.sequelize.QueryTypes.UPDATE,
			logging: false,
		});
		return data;
	}
}

module.exports = LulusanRepo;
