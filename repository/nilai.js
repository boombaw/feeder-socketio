const { db } = require("../database/mysql/conn");

class Nilai {
	constructor() {}

	async getNilaiTransaksi(kd_jadwal) {
		let sqlQuery = `SELECT
                            b.THSMSTRLNM AS tahun,
                            b.KDPSTTRLNM AS kd_prodi,
                            b.NIMHSTRLNM AS npm,
                            tm.NMMHSMSMHS as nama,
                            b.KDKMKTRLNM AS kd_matakuliah,
                            b.NLAKHTRLNM AS nilai_indeks,
                            b.BOBOTTRLNM AS bobot,
                            b.kd_transaksi_nilai ,
                            b.nilai_akhir ,
                            a.kd_jadwal ,
                            a.tipe ,
                            a.nilai
                        FROM
                            tbl_nilai_detail a
                        LEFT JOIN
                            tbl_transaksi_nilai b
                        ON
                            a.kd_transaksi_nilai = b.kd_transaksi_nilai
                        JOIN tbl_mahasiswa tm on tm.NIMHSMSMHS = b.NIMHSTRLNM
                        WHERE
                            a.tipe = '10'
                        AND
                            a.kd_jadwal = :kd_jadwal `;
		const data = db.sequelize.query(sqlQuery, {
			replacements: { kd_jadwal },
			type: db.sequelize.QueryTypes.SELECT,
			logging: false,
		});

		return data;
	}
}

module.exports = Nilai;
