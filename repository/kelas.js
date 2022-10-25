const { db } = require("../database/mysql/conn");

class Kelas {
	constructor() {}

	async getJadwalByKdJadwal(kd_jadwal, tahun, kd_prodi) {
		let filter_kd_kurikulum = "";

		if (tahun < 20221) {
			let kd_kurikulum = kd_prodi + "19";
			filter_kd_kurikulum = ` AND kd_kurikulum LIKE '%${kd_kurikulum}%'`;
		}
		let sqlQuery = `SELECT 
                            * 
                        FROM 
                            view_detail_jadwal_matkul_feeder 
                        WHERE 
                            kd_jadwal = :kd_jadwal 
                        AND kd_tahunajaran = :tahun `;

		sqlQuery += filter_kd_kurikulum;

		const data = await db.sequelize.query(sqlQuery, {
			replacements: {
				kd_jadwal,
				tahun,
				kd_prodi,
			},
			type: db.sequelize.QueryTypes.SELECT,
			logging: false,
			// plain: true,
		});

		return data;
	}

	async getJadwalProdi(kd_prodi, tahun) {
		let filter_kd_kurikulum = "";

		if (tahun < 20221) {
			let kd_kurikulum = await this.getKodeKurikulum(kd_prodi, -1);
			filter_kd_kurikulum = ` AND kd_kurikulum LIKE '%${kd_kurikulum}%'`;
		} else {
			let kd_kurikulum = await this.getKodeKurikulum(kd_prodi, 1);
			filter_kd_kurikulum = ` AND kd_kurikulum LIKE '%${kd_kurikulum}%'`;
		}

		let sqlQuery = `SELECT
                            a.*,
                            (SELECT count(DISTINCT npm_mahasiswa) AS peserta FROM tbl_krs tk WHERE tk.kd_jadwal = a.kd_jadwal) as peserta
                        FROM
                            view_detail_jadwal_matkul_feeder a
                        WHERE
                            a.kd_tahunajaran = :tahun
                            and a.kd_prodi = :kd_prodi ${filter_kd_kurikulum}
                        ORDER BY
                            a.kd_matakuliah ASC, a.kelas ASC`;

		const data = await db.sequelize.query(sqlQuery, {
			replacements: {
				kd_prodi,
				tahun,
			},
			type: db.sequelize.QueryTypes.SELECT,
			logging: false,
			// plain: true,
		});

		return data;
	}

	async getKodeKurikulum(kd_prodi, is_active = -1) {
		let status = "";
		switch (is_active) {
			case -1:
				status = " and status != 1";
				break;
			case 1:
				status = " and status = 1";
			default:
				status = "";
				break;
		}

		let sqlQuery = `SELECT kd_kurikulum FROM tbl_kurikulum_neww tmn WHERE tmn.kd_prodi = :kd_prodi ${status} ORDER BY tmn.id_kurikulum DESC LIMIT 1`;

		const data = await db.sequelize.query(sqlQuery, {
			replacements: {
				kd_prodi,
			},
			logging: false,
			type: db.sequelize.QueryTypes.SELECT,
			plain: true,
		});

		let { kd_kurikulum } = data;

		return kd_kurikulum;
	}

	async updateJadwal(kd_jadwal, id_kelas_kuliah) {
		const t = await db.sequelize.transaction();
		try {
			let sqlQuery = `UPDATE tbl_jadwal_matkul
                            SET id_kelas_kuliah_feeder=:id_kelas_kuliah
                        WHERE kd_jadwal= :kd_jadwal`;

			const data = await db.sequelize.query(sqlQuery, {
				transaction: t,
				replacements: {
					kd_jadwal,
					id_kelas_kuliah,
				},
				type: db.sequelize.QueryTypes.UPDATE,
				logging: false,
				// plain: true,
			});

			await t.commit();
			return data;
		} catch {
			await t.rollback();
		}
	}
}

module.exports = Kelas;
