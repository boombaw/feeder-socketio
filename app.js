const { app, server } = require("./websocket");
const cors = require("cors");
const bodyParser = require("body-parser");

//websocket
require("./routes/lulusan"); // lulusan -> [insert lulusan]
require("./routes/akm"); //akm -> [update akm, insert akm]
require("./routes/cuti"); //cuti -> [insert akm]

app.use(cors);

app.get("/", (req, res) => {
	res.send("Hello World!");
});

const port = process.env.PORT || 4647;

server.listen(port, () => {
	console.log(`listening on *:${port}`);
});
