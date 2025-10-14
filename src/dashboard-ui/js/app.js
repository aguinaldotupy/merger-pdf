// Main application logic
const App = {
	init() {
		// Initialize Auth module to restore token from sessionStorage
		Auth.init();
		this.setupEventListeners();
		this.checkAuth();
	},

	setupEventListeners() {
		// Login form
		document.getElementById("login-form").addEventListener("submit", (e) => {
			e.preventDefault();
			this.handleLogin();
		});

		// Logout button
		document.getElementById("logout-btn").addEventListener("click", () => {
			this.handleLogout();
		});

		// Tab navigation
		for (const button of document.querySelectorAll(".tab-trigger")) {
			button.addEventListener("click", () => {
				this.switchTab(button.dataset.tab);
			});
		}

		// Refresh buttons
		document
			.getElementById("overview-refresh-btn")
			.addEventListener("click", () => {
				this.loadOverview();
			});
		document
			.getElementById("urls-refresh-btn")
			.addEventListener("click", () => {
				this.loadTopUrls();
			});
		document
			.getElementById("errors-refresh-btn")
			.addEventListener("click", () => {
				this.loadErrors();
			});

		// Limit selectors
		document.getElementById("urls-limit").addEventListener("change", () => {
			this.loadTopUrls();
		});
		document.getElementById("errors-limit").addEventListener("change", () => {
			this.loadErrors();
		});
		document.getElementById("errors-group").addEventListener("change", () => {
			this.loadErrors();
		});
	},

	checkAuth() {
		if (Auth.isAuthenticated()) {
			this.showDashboard();
		} else {
			this.showLogin();
		}
	},

	showLogin() {
		document.getElementById("login-page").classList.remove("hidden");
		document.getElementById("dashboard").classList.add("hidden");
	},

	showDashboard() {
		document.getElementById("login-page").classList.add("hidden");
		document.getElementById("dashboard").classList.remove("hidden");
		this.loadOverview();
	},

	async handleLogin() {
		const tokenInput = document.getElementById("token-input");
		const errorDiv = document.getElementById("login-error");
		const token = tokenInput.value.trim();

		errorDiv.classList.add("hidden");

		try {
			Auth.login(token);

			// Test the token by making a health check
			await API.checkHealth();

			this.showDashboard();
		} catch (error) {
			errorDiv.textContent =
				error.message || "Token inválido. Verifique e tente novamente.";
			errorDiv.classList.remove("hidden");
			Auth.logout();
		}
	},

	handleLogout() {
		Auth.logout();
		this.showLogin();
		document.getElementById("token-input").value = "";
	},

	switchTab(tabName) {
		// Update tab triggers
		for (const button of document.querySelectorAll(".tab-trigger")) {
			if (button.dataset.tab === tabName) {
				button.classList.add("active");
			} else {
				button.classList.remove("active");
			}
		}

		// Update tab panels
		for (const panel of document.querySelectorAll(".tab-panel")) {
			panel.classList.remove("active");
		}
		document.getElementById(`${tabName}-tab`).classList.add("active");

		// Load data for the tab if needed
		if (tabName === "overview") {
			this.loadOverview();
		} else if (tabName === "top-urls") {
			this.loadTopUrls();
		} else if (tabName === "errors") {
			this.loadErrors();
		}
	},

	async loadOverview() {
		const loading = document.getElementById("overview-loading");
		const error = document.getElementById("overview-error");
		const content = document.getElementById("overview-content");
		const empty = document.getElementById("overview-empty");

		loading.classList.remove("hidden");
		error.classList.add("hidden");
		content.classList.add("hidden");
		empty.classList.add("hidden");

		try {
			const data = await API.getOverview();

			if (!data || !data.byStatusCode || data.byStatusCode.length === 0) {
				empty.classList.remove("hidden");
				loading.classList.add("hidden");
				return;
			}

			this.renderOverview(data);
			content.classList.remove("hidden");
			loading.classList.add("hidden");
		} catch (err) {
			error.textContent = `Erro ao carregar dados: ${err.message}`;
			error.classList.remove("hidden");
			loading.classList.add("hidden");
		}
	},

	renderOverview(data) {
		// Use the aggregated data from API
		const total = data.total;
		const success = data.success;
		const redirect = data.redirect;
		const clientError = data.clientError;
		const serverError = data.serverError;
		const byStatusCode = data.byStatusCode;

		// Render stat cards
		const statsGrid = document.getElementById("stats-grid");
		statsGrid.innerHTML = `
			<div class="stat-card info">
				<div class="stat-label">Total de Downloads</div>
				<div class="stat-value">${total.toLocaleString()}</div>
			</div>
			<div class="stat-card success">
				<div class="stat-label">Sucesso (2xx)</div>
				<div class="stat-value">${success.toLocaleString()}</div>
			</div>
			<div class="stat-card warning">
				<div class="stat-label">Redirecionamentos (3xx)</div>
				<div class="stat-value">${redirect.toLocaleString()}</div>
			</div>
			<div class="stat-card error">
				<div class="stat-label">Erro Cliente (4xx)</div>
				<div class="stat-value">${clientError.toLocaleString()}</div>
			</div>
			<div class="stat-card error">
				<div class="stat-label">Erro Servidor (5xx)</div>
				<div class="stat-value">${serverError.toLocaleString()}</div>
			</div>
		`;

		// Render table
		const tbody = document.getElementById("overview-tbody");
		tbody.innerHTML = byStatusCode
			.map((item) => {
				let badgeClass = "badge-secondary";
				if (item.statusCode >= 200 && item.statusCode < 300)
					badgeClass = "badge-success";
				else if (item.statusCode >= 400) badgeClass = "badge-error";
				else if (item.statusCode >= 300 && item.statusCode < 400)
					badgeClass = "badge-warning";

				return `
				<tr>
					<td><span class="badge ${badgeClass}">${item.statusCode}</span></td>
					<td><strong>${item.count.toLocaleString()}</strong></td>
					<td class="text-right">${item.percentage.toFixed(1)}%</td>
				</tr>
			`;
			})
			.join("");
	},

	async loadTopUrls() {
		const limit = document.getElementById("urls-limit").value;
		const loading = document.getElementById("urls-loading");
		const error = document.getElementById("urls-error");
		const content = document.getElementById("urls-content");
		const empty = document.getElementById("urls-empty");

		loading.classList.remove("hidden");
		error.classList.add("hidden");
		content.classList.add("hidden");
		empty.classList.add("hidden");

		try {
			const data = await API.getTopUrls(limit);

			if (!data || data.length === 0) {
				empty.classList.remove("hidden");
				loading.classList.add("hidden");
				return;
			}

			this.renderTopUrls(data);
			content.classList.remove("hidden");
			loading.classList.add("hidden");
		} catch (err) {
			error.textContent = `Erro ao carregar URLs: ${err.message}`;
			error.classList.remove("hidden");
			loading.classList.add("hidden");
		}
	},

	renderTopUrls(data) {
		const tbody = document.getElementById("urls-tbody");
		tbody.innerHTML = data
			.map((item) => {
				const successRate = item.successRate.toFixed(1);
				const rateClass = "";
				let rateColor = "";
				if (successRate >= 95) {
					rateColor = "#22c55e";
				} else if (successRate >= 80) {
					rateColor = "#f59e0b";
				} else {
					rateColor = "#ef4444";
				}

				return `
				<tr>
					<td class="truncate" style="max-width: 300px;" title="${item.url}">
						<span class="font-mono">${item.url}</span>
					</td>
					<td class="text-right"><strong>${item.accessCount.toLocaleString()}</strong></td>
					<td class="text-right" style="color: #22c55e;">${item.successCount.toLocaleString()}</td>
					<td class="text-right" style="color: #ef4444;">${item.errorCount.toLocaleString()}</td>
					<td class="text-right" style="color: ${rateColor}; font-weight: 600;">
						${successRate}%
					</td>
					<td style="font-size: 0.875rem; color: hsl(var(--muted-foreground));">
						${new Date(item.firstAccessed).toLocaleString("pt-BR")}
					</td>
					<td style="font-size: 0.875rem; color: hsl(var(--muted-foreground));">
						${new Date(item.lastAccessed).toLocaleString("pt-BR")}
					</td>
				</tr>
			`;
			})
			.join("");
	},

	async loadErrors() {
		const limit = document.getElementById("errors-limit").value;
		const groupBy = document.getElementById("errors-group").value;
		const loading = document.getElementById("errors-loading");
		const error = document.getElementById("errors-error");
		const content = document.getElementById("errors-content");
		const empty = document.getElementById("errors-empty");

		loading.classList.remove("hidden");
		error.classList.add("hidden");
		content.classList.add("hidden");
		empty.classList.add("hidden");

		try {
			const data = await API.getErrors(limit, groupBy);

			if (!data || data.length === 0) {
				empty.classList.remove("hidden");
				loading.classList.add("hidden");
				return;
			}

			this.renderErrors(data);
			content.classList.remove("hidden");
			loading.classList.add("hidden");
		} catch (err) {
			error.textContent = `Erro ao carregar erros: ${err.message}`;
			error.classList.remove("hidden");
			loading.classList.add("hidden");
		}
	},

	renderErrors(data) {
		const tbody = document.getElementById("errors-tbody");
		tbody.innerHTML = data
			.map((item) => {
				const statusCode = item.statusCode;
				let badgeClass = "badge-error";
				let badgeLabel = "Server Error";
				if (statusCode >= 400 && statusCode < 500) {
					badgeClass = "badge-warning";
					badgeLabel = "Client Error";
				}

				const errorMessage =
					item.errorMessage ||
					'<em style="color: hsl(var(--muted-foreground));">Sem mensagem de erro</em>';

				return `
				<tr>
					<td style="font-size: 0.875rem; white-space: nowrap;">
						${new Date(item.timestamp).toLocaleString("pt-BR")}
					</td>
					<td class="truncate" style="max-width: 300px;" title="${item.url}">
						<span class="font-mono">${item.url}</span>
					</td>
					<td class="text-center">
						<span class="badge ${badgeClass}" title="${badgeLabel}">
							${statusCode}
						</span>
					</td>
					<td class="truncate" style="max-width: 400px;" title="${item.errorMessage || "Sem mensagem"}">
						${errorMessage}
					</td>
				</tr>
			`;
			})
			.join("");
	},
};

// Initialize the app when DOM is ready
if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", () => App.init());
} else {
	App.init();
}
