/* eslint-disable no-console */
const { io } = require('../../../websocket');
const db = require('../../../database/mysql/conn');
const {
  SelectLastAKM,
  SELECT_AKM_NA,
} = require('../../../database/query/query');

const { studyStart } = require('../../../util/helper');

const {
  token,
  insertNAFeeder,
  idRegistrasiMahasiswa,
} = require('../../../services/feeder');

const insertAKMNA = io.of('/insert-akm-na');

// Get data from database
async function ListNonAktif(kd_prodi, tahun) {
  const study_start = studyStart(tahun);

  const data = await db.sequelize.query(SELECT_AKM_NA, {
    replacements: {
      kd_prodi,
      tahun,
      study_start,
    },
    type: db.sequelize.QueryTypes.SELECT,
  });

  return data;
}

async function LastAKM(npm) {
  const data = await db.sequelize.query(SelectLastAKM, {
    replacements: {
      npm,
    },
    type: db.sequelize.QueryTypes.SELECT,
    logging: false,
  });

  return data.shift();
}

async function InsertNA(
  name,
  npm,
  semester,
  ipk,
  ips,
  sks,
  total_sks,
  biaya,
  token,
  index,
) {
  const response = {};

  let { error_code, error_desc, data } = await idRegistrasiMahasiswa(
    token,
    npm,
  );

  if (error_code === 0) {
    // get id registrasi mahasiswa from feeder
    const { id_registrasi_mahasiswa } = data.shift();

    ips = parseFloat(ips).toFixed(2);
    ipk = parseFloat(ipk).toFixed(2);
    sks = parseFloat(sks);
    total_sks = parseFloat(total_sks);

    if (biaya === null || Number.isNaN(biaya) || biaya === undefined) {
      biaya = 0;
    } else {
      biaya = parseInt(biaya, 10);
    }

    const arg = {
      ips,
      ipk,
      sks_semester: sks,
      total_sks,
      sks,
      biaya_kuliaha_smt: biaya,
      id_registrasi_mahasiswa,
      id_status_mahasiswa: 'N',
      id_semester: semester,
    };

    // insert akm na to feeder
    ({ error_code, error_desc, data } = await insertNAFeeder(token, arg));

    if (error_code === 0) {
      response.list = {
        order: index,
        npm,
        name,
        status: '<span class="badge rounded-pill bg-success " style="font-size:0.8rem !important">Berhasil</span>',
      };
    } else {
      response.list = {
        order: index,
        npm,
        name,
        status: '<span class="badge rounded-pill bg-danger " style="font-size:0.8rem !important">Gagal</span>',
      };
    }
  }

  response.error_code = error_code;
  response.error_desc = error_desc;

  return response;
}

insertAKMNA.on('connection', async (socket) => {
  const userId = socket.id;

  socket.on('insert-akm-na', async (data) => {
    const { kd_prodi, tahun } = JSON.parse(data);

    const feederToken = await token();
    insertAKMNA
      .to(userId)
      .emit(
        'info',
        JSON.stringify({ message: 'Sedang mengambil token' }),
      );

    let { error_code, error_desc, data: dataToken } = feederToken;

    if (error_code === 0) {
      const { tokenFeeder } = dataToken;
      const naData = await ListNonAktif(kd_prodi, tahun);

      // send total data to client
      insertAKMNA
        .to(userId)
        .emit(
          `total_insert_akm_na_${kd_prodi}`,
          JSON.stringify({ total: naData.length }),
        );

      for (let i = 0; i < naData.length; i++) {
        const { npm, name } = naData[i];

        const akm = await LastAKM(npm);
        const {
          ips, ipk, sks, total_sks, biaya,
        } = akm;

        const response = await InsertNA(
          name,
          npm,
          tahun,
          ipk,
          ips,
          sks,
          total_sks,
          biaya,
          tokenFeeder,
          i + 1,
        );

        ({ error_code, error_desc } = response);

        if (!Object.prototype.hasOwnProperty.call(response, 'list') && error_code > 0) {
          insertAKMNA
            .to(userId)
            .emit('error', JSON.stringify({ error: error_desc }));
        } else {
          insertAKMNA
            .to(userId)
            .emit('insert-akm-na', JSON.stringify(response));
        }
      }
    } else {
      insertAKMNA
        .to(userId)
        .emit('error', JSON.stringify({ error: error_desc }));
    }
  });
});

insertAKMNA.on('error', async (err) => {
  console.log(`connect_error due to ${err.message}`);
});

insertAKMNA.on('disconnect', async (reason) => {
  console.log(`disconnect due to ${reason}`);
});

module.exports = insertAKMNA;
