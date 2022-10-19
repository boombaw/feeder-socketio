const GetLulusan = `SELECT
                        tl.ahir_bim ,
                        tl.npm_mahasiswa npm,
                        tl.sk_yudisium ,
                        tl.tgl_yudisium ,
                        tl.tgl_lulus ,
                        tl.ta_lulus ,
                        tl.sks,
                        tl.ipk ,
                        tl.no_ijazah ,
                        tl.jdl_skripsi ,
                        tl.jdl_skripsi_en ,
                        tl.pem1 ,
                        tl.pem2 ,
                        tl.dospem1 ,
                        tl.dospem2 ,
                        tl.mulai_bim ,
                        tl.ahir_bim ,
                        tl.flag_feeder ,
                        tl.no_transkrip_akademik,
                        tl.has_sync,
                        tm.NMMHSMSMHS AS name,
                    FROM
                        tbl_lulusan tl
                    JOIN tbl_mahasiswa tm ON
                        tm.NIMHSMSMHS = tl.npm_mahasiswa
                    WHERE
                        tm.KDPSTMSMHS = :kd_prodi AND tl.ta_lulus = :ta_lulus `;

const SELECT_AKM = `SELECT
                        takm.id,
                        takm.NIMHSTRAKM npm,
                        tm.NMMHSMSMHS AS name,
                        takm.NLIPSTRAKM ips,
                        takm.NLIPKTRAKM ipk,
                        takm.SKSEMTRAKM sks,
                        takm.SKSTTTRAKM total_sks,
                        takm.BIAYA biaya 
                    FROM
                        tbl_aktifitas_kuliah_mahasiswa takm 
                    JOIN tbl_mahasiswa tm ON
                        tm.NIMHSMSMHS = takm.NIMHSTRAKM
                    WHERE takm.KDPSTTRAKM  = :kd_prodi AND takm.THSMSTRAKM = :tahun`;

const SELECT_CUTI = `SELECT
                        a .*,
                        b.NIMHSMSMHS npm,
                        b.NMMHSMSMHS name
                    FROM
                        tbl_status_mahasiswa AS a
                    JOIN tbl_mahasiswa AS b ON
                        a.npm = b.NIMHSMSMHS
                    WHERE
                        b.KDPSTMSMHS = :kd_prodi
                        AND a.tahunajaran = :tahun
                        AND a.status = 'C' `;

const SELECT_DROPOUT = `SELECT
                            a.npm,
                            b.NMMHSMSMHS AS name,
                            a.status ,
                            a.tahunajaran ,
                            a.validate ,
                            c.skep,
                            c.tgl_skep,
                            c.alasan,
                            b.KDPSTMSMHS kd_prodi
                        FROM
                            tbl_status_mahasiswa AS a
                        JOIN tbl_mahasiswa AS b ON
                            a.npm = b.NIMHSMSMHS
                        JOIN tbl_dropout AS c ON
                            a.npm = c.npm_mahasiswa
                        WHERE
                            a.tahunajaran = :tahun
                        AND b.KDPSTMSMHS  = :kd_prodi
                        AND a.status IN('D', 'K', 'W')`;

module.exports = { GetLulusan, SELECT_AKM, SELECT_CUTI, SELECT_DROPOUT };
