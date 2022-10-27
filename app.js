const cors = require("cors");
const { app, server } = require("./websocket");

// websocket
require("./routes/lulusan"); // lulusan -> [insert lulusan]
require("./routes/akm"); // akm -> [update akm, insert akm]
require("./routes/cuti"); // cuti -> [insert akm]
require("./routes/dropout"); // dropout -> [insert dropout, update dropout]
require("./routes/maba");
require("./routes/kelas");
require("./routes/krs");
require("./routes/ajar_dosen");

app.use(cors);

app.get("/", (req, res) => {
	res.send("Hello World!");
});

const port = process.env.PORT || 4647;

server.listen(port, () => {
	console.log(`listening on *:${port}`);
});
