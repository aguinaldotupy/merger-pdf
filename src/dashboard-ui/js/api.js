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

	async getDownloads(filters = {}, pagination = {}) {
		const params = new URLSearchParams();

		// Pagination
		if (pagination.page) params.append("page", pagination.page);
		if (pagination.pageSize) params.append("pageSize", pagination.pageSize);
		if (pagination.sortBy) params.append("sortBy", pagination.sortBy);
		if (pagination.sortOrder) params.append("sortOrder", pagination.sortOrder);

		// Filters
		if (filters.search) params.append("search", filters.search);
		if (filters.statusCode) params.append("statusCode", filters.statusCode);
		if (filters.statusRange) params.append("statusRange", filters.statusRange);
		if (filters.dateFrom) params.append("dateFrom", filters.dateFrom);
		if (filters.dateTo) params.append("dateTo", filters.dateTo);

		const response = await this.request(`/downloads?${params.toString()}`);
		return response;
	},

	async checkHealth() {
		const response = await this.request("/health");
		return response.data;
	},
};
