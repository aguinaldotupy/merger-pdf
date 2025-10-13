// Authentication module
const Auth = {
	TOKEN_KEY: "analytics_token",

	init() {
		// Try to restore token from sessionStorage on page load
		const savedToken = sessionStorage.getItem(this.TOKEN_KEY);
		if (savedToken) {
			API.setToken(savedToken);
		}
	},

	login(token) {
		if (!token || token.length < 32) {
			throw new Error("Token deve ter pelo menos 32 caracteres");
		}
		// Save to sessionStorage
		sessionStorage.setItem(this.TOKEN_KEY, token);
		API.setToken(token);
	},

	logout() {
		// Remove from sessionStorage
		sessionStorage.removeItem(this.TOKEN_KEY);
		API.setToken(null);
	},

	isAuthenticated() {
		return !!sessionStorage.getItem(this.TOKEN_KEY);
	},

	getToken() {
		return sessionStorage.getItem(this.TOKEN_KEY);
	},
};
