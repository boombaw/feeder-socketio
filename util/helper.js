const JenisKeluar = {
	Dikeluarkan: 3,
	MengundurkanDiri: 4,
	Wafat: 6,
};

const statusMhs = {
	aktif: "A",
	nonAktif: "N",
};

const studyStart = (tahun) => {
	tahun = parseInt(tahun);
	let front = tahun.toString().substr(0, 4);
	let back = tahun.toString().substr(tahun.length - 1);

	if ([20202, 20221, 20212].includes(tahun)) {
		back = 1;
	}

	let f = parseInt(front);
	let b = parseInt(back);

	let new_year = f - 7;
	let fix_year = `${new_year}${b}`;

	return fix_year;
};

module.exports = { JenisKeluar, statusMhs, studyStart };
