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

	async getChartData(groupBy = "week") {
		const response = await this.request(`/chart-data?groupBy=${groupBy}`);
		return response.data;
	},

	async checkHealth() {
		const response = await this.request("/health");
		return response.data;
	},

	async getProcessingOverview() {
		const response = await this.request("/processing/overview");
		return response.data;
	},

	async getProcessingErrors(limit = 50) {
		const response = await this.request(`/processing/errors?limit=${limit}`);
		return response.data;
	},
};

// Apps API client
const AppsAPI = {
	baseURL: "/api/apps",
	token: null,

	setToken(token) {
		this.token = token;
	},

	getToken() {
		return this.token || API.token;
	},

	async request(endpoint, options = {}) {
		const url = `${this.baseURL}${endpoint}`;
		const headers = {
			"Content-Type": "application/json",
			...options.headers,
		};

		const token = this.getToken();
		if (token) {
			headers["X-API-Token"] = token;
		}

		const response = await fetch(url, {
			...options,
			headers,
		});

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			const error = new Error(
				errorData.error || `HTTP error! status: ${response.status}`,
			);
			error.status = response.status;
			throw error;
		}

		return response.json();
	},

	async listApps() {
		const response = await this.request("");
		return response.data;
	},

	async getApp(id) {
		const response = await this.request(`/${id}`);
		return response.data;
	},

	async createApp(name) {
		const response = await this.request("", {
			method: "POST",
			body: JSON.stringify({ name }),
		});
		return response.data;
	},

	async toggleAppStatus(id) {
		const response = await this.request(`/${id}/toggle`, {
			method: "PATCH",
		});
		return response.data;
	},

	async regenerateToken(id) {
		const response = await this.request(`/${id}/regenerate-token`, {
			method: "POST",
		});
		return response.data;
	},

	async deleteApp(id) {
		const response = await this.request(`/${id}`, {
			method: "DELETE",
		});
		return response;
	},
};
