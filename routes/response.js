class responseHTTP {
	constructor() {
		this.response = {
			error_code: 0,
			error_desc: "",
			list: null,
		};
	}

	setResponse(status, message, data) {
		this.response.error_code = status;
		this.response.error_desc = message;
		this.response.list = data;
	}

	getResponse() {
		return this.response;
	}
}

module.exports = { responseHTTP };
