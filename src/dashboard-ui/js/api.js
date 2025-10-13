// API client for analytics dashboard
const API = {
	baseURL: "/api/analytics",
	token: null,

	setToken(token) {
		this.token = token;
	},

	getToken() {
		return this.token;
	},

	async request(endpoint, options = {}) {
		const url = `${this.baseURL}${endpoint}`;
		const headers = {
			"Content-Type": "application/json",
			...options.headers,
		};

		if (this.token) {
			headers["X-API-Token"] = this.token;
		}

		const response = await fetch(url, {
			...options,
			headers,
		});

		if (!response.ok) {
			const error = new Error(`HTTP error! status: ${response.status}`);
			error.status = response.status;
			throw error;
		}

		return response.json();
	},

	async getOverview() {
		const response = await this.request("/overview");
		return response.data;
	},

	async getTopUrls(limit = 25) {
		const response = await this.request(`/top-urls?limit=${limit}`);
		return response.data;
	},

	async getErrors(limit = 50, groupBy = "event") {
		const response = await this.request(
			`/errors?limit=${limit}&groupBy=${groupBy}`,
		);
		return response.data;
	},

	async checkHealth() {
		const response = await this.request("/health");
		return response.data;
	},
};
