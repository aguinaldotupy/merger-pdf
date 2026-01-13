// Main application logic
const App = {
	currentDownloadsPage: 1,
	totalDownloadsPages: 1,
	downloadsSearchTimeout: null,
	downloadsChart: null,

	init() {
		// Initialize Auth module to restore token from sessionStorage
		Auth.init();
		// Initialize Apps module
		AppsManager.init();
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
		document
			.getElementById("downloads-refresh-btn")
			.addEventListener("click", () => {
				this.currentDownloadsPage = 1;
				this.loadDownloads();
			});
		document
			.getElementById("processing-refresh-btn")
			.addEventListener("click", () => {
				this.loadProcessing();
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
		document
			.getElementById("processing-limit")
			.addEventListener("change", () => {
				this.loadProcessing();
			});

		// Chart grouping selector
		document.getElementById("chart-grouping").addEventListener("change", () => {
			this.loadChart();
		});

		// Downloads filters and pagination
		document
			.getElementById("downloads-search")
			.addEventListener("input", () => {
				clearTimeout(this.downloadsSearchTimeout);
				this.downloadsSearchTimeout = setTimeout(() => {
					this.currentDownloadsPage = 1;
					this.loadDownloads();
				}, 500);
			});
		document
			.getElementById("downloads-status-range")
			.addEventListener("change", () => {
				this.currentDownloadsPage = 1;
				this.loadDownloads();
			});
		document
			.getElementById("downloads-sort-by")
			.addEventListener("change", () => {
				this.currentDownloadsPage = 1;
				this.loadDownloads();
			});
		document
			.getElementById("downloads-sort-order")
			.addEventListener("change", () => {
				this.currentDownloadsPage = 1;
				this.loadDownloads();
			});
		document
			.getElementById("downloads-page-size")
			.addEventListener("change", () => {
				this.currentDownloadsPage = 1;
				this.loadDownloads();
			});
		document
			.getElementById("downloads-prev-btn")
			.addEventListener("click", () => {
				if (this.currentDownloadsPage > 1) {
					this.currentDownloadsPage--;
					this.loadDownloads();
				}
			});
		document
			.getElementById("downloads-next-btn")
			.addEventListener("click", () => {
				if (this.currentDownloadsPage < this.totalDownloadsPages) {
					this.currentDownloadsPage++;
					this.loadDownloads();
				}
			});

		// Downloads table header sorting
		for (const th of document.querySelectorAll(
			"#downloads-table th.sortable",
		)) {
			th.addEventListener("click", () => {
				const sortBy = th.dataset.sort;
				const currentSortBy =
					document.getElementById("downloads-sort-by").value;
				const currentSortOrder = document.getElementById(
					"downloads-sort-order",
				).value;

				// Toggle order if clicking same column, otherwise default to desc
				let newSortOrder = "desc";
				if (sortBy === currentSortBy) {
					newSortOrder = currentSortOrder === "desc" ? "asc" : "desc";
				}

				// Update selects
				document.getElementById("downloads-sort-by").value = sortBy;
				document.getElementById("downloads-sort-order").value = newSortOrder;

				// Reset to page 1 and reload
				this.currentDownloadsPage = 1;
				this.loadDownloads();
			});
		}
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
		} else if (tabName === "downloads") {
			this.loadDownloads();
		} else if (tabName === "processing") {
			this.loadProcessing();
		} else if (tabName === "apps") {
			AppsManager.loadApps();
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
			this.loadChart();
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
			<div class="stat-card card-info">
				<div class="stat-label">Total de Downloads</div>
				<div class="stat-value">${total.toLocaleString()}</div>
			</div>
			<div class="stat-card card-success">
				<div class="stat-label">Sucesso (2xx)</div>
				<div class="stat-value">${success.toLocaleString()}</div>
			</div>
			<div class="stat-card card-warning">
				<div class="stat-label">Redirecionamentos (3xx)</div>
				<div class="stat-value">${redirect.toLocaleString()}</div>
			</div>
			<div class="stat-card card-client-error">
				<div class="stat-label">Erro Cliente (4xx)</div>
				<div class="stat-value">${clientError.toLocaleString()}</div>
			</div>
			<div class="stat-card card-server-error">
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

	async loadChart() {
		try {
			const groupBy = document.getElementById("chart-grouping").value;
			const data = await API.getChartData(groupBy);

			this.renderChart(data);
		} catch (err) {
			console.error("Error loading chart data:", err);
		}
	},

	renderChart(data) {
		const ctx = document.getElementById("downloads-chart");

		// Destroy previous chart instance if exists
		if (this.downloadsChart) {
			this.downloadsChart.destroy();
		}

		// Create new chart
		this.downloadsChart = new Chart(ctx, {
			type: "line",
			data: {
				labels: data.labels,
				datasets: [
					{
						label: "Total",
						data: data.datasets.total,
						borderColor: "#3b82f6",
						backgroundColor: "rgba(59, 130, 246, 0.1)",
						borderWidth: 2,
						tension: 0.3,
					},
					{
						label: "Sucesso (2xx)",
						data: data.datasets.success,
						borderColor: "#22c55e",
						backgroundColor: "rgba(34, 197, 94, 0.1)",
						borderWidth: 2,
						tension: 0.3,
					},
					{
						label: "Redirecionamento (3xx)",
						data: data.datasets.redirect,
						borderColor: "#f59e0b",
						backgroundColor: "rgba(245, 158, 11, 0.1)",
						borderWidth: 2,
						tension: 0.3,
					},
					{
						label: "Erro Cliente (4xx)",
						data: data.datasets.clientError,
						borderColor: "#f97316",
						backgroundColor: "rgba(249, 115, 22, 0.1)",
						borderWidth: 2,
						tension: 0.3,
					},
					{
						label: "Erro Servidor (5xx)",
						data: data.datasets.serverError,
						borderColor: "#ef4444",
						backgroundColor: "rgba(239, 68, 68, 0.1)",
						borderWidth: 2,
						tension: 0.3,
					},
				],
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				interaction: {
					mode: "index",
					intersect: false,
				},
				plugins: {
					legend: {
						position: "top",
						labels: {
							usePointStyle: true,
							padding: 15,
						},
					},
					tooltip: {
						backgroundColor: "rgba(0, 0, 0, 0.8)",
						padding: 12,
						titleFont: {
							size: 14,
						},
						bodyFont: {
							size: 13,
						},
					},
				},
				scales: {
					y: {
						beginAtZero: true,
						ticks: {
							precision: 0,
						},
						grid: {
							color: "rgba(0, 0, 0, 0.05)",
						},
					},
					x: {
						grid: {
							display: false,
						},
					},
				},
			},
		});
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

	escapeHtml(text) {
		const div = document.createElement("div");
		div.textContent = text;
		return div.innerHTML;
	},

	isValidHttpUrl(url) {
		try {
			const parsed = new URL(url);
			return ["http:", "https:"].includes(parsed.protocol);
		} catch {
			return false;
		}
	},

	renderTopUrls(data) {
		const tbody = document.getElementById("urls-tbody");
		tbody.innerHTML = data
			.map((item) => {
				const successRate = item.successRate.toFixed(1);
				let rateColor = "";
				if (successRate >= 95) {
					rateColor = "#22c55e";
				} else if (successRate >= 80) {
					rateColor = "#f59e0b";
				} else {
					rateColor = "#ef4444";
				}

				const escapedUrl = this.escapeHtml(item.url);
				return `
				<tr>
					<td class="truncate" style="max-width: 300px;" title="${escapedUrl}">
						<span class="font-mono">${escapedUrl}</span>
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

				const escapedUrl = this.escapeHtml(item.url);
				const isValidUrl = this.isValidHttpUrl(item.url);
				const rawErrorMessage = item.errorMessage || "";
				const escapedErrorMessage = rawErrorMessage
					? this.escapeHtml(rawErrorMessage)
					: '<em style="color: hsl(var(--muted-foreground));">Sem mensagem de erro</em>';

				// Only render clickable link for valid http/https URLs (prevents XSS via javascript: protocol)
				const urlContent = isValidUrl
					? `<a href="${escapedUrl}" target="_blank" rel="noopener noreferrer" class="font-mono url-link">${escapedUrl}</a>`
					: `<span class="font-mono">${escapedUrl}</span>`;

				return `
				<tr>
					<td style="font-size: 0.875rem; white-space: nowrap;">
						${new Date(item.timestamp).toLocaleString("pt-BR")}
					</td>
					<td class="url-cell">
						${urlContent}
					</td>
					<td class="text-center">
						<span class="badge ${badgeClass}" title="${badgeLabel}">
							${statusCode}
						</span>
					</td>
					<td class="error-message-cell">
						${escapedErrorMessage}
					</td>
				</tr>
			`;
			})
			.join("");
	},

	async loadDownloads() {
		const loading = document.getElementById("downloads-loading");
		const error = document.getElementById("downloads-error");
		const content = document.getElementById("downloads-content");
		const empty = document.getElementById("downloads-empty");

		loading.classList.remove("hidden");
		error.classList.add("hidden");
		content.classList.add("hidden");
		empty.classList.add("hidden");

		try {
			// Get filter values
			const search = document.getElementById("downloads-search").value.trim();
			const statusRange = document.getElementById(
				"downloads-status-range",
			).value;
			const sortBy = document.getElementById("downloads-sort-by").value;
			const sortOrder = document.getElementById("downloads-sort-order").value;
			const pageSize = Number.parseInt(
				document.getElementById("downloads-page-size").value,
				10,
			);

			const filters = {};
			if (search) filters.search = search;
			if (statusRange) filters.statusRange = statusRange;

			const pagination = {
				page: this.currentDownloadsPage,
				pageSize,
				sortBy,
				sortOrder,
			};

			const response = await API.getDownloads(filters, pagination);

			if (!response.data || response.data.length === 0) {
				empty.classList.remove("hidden");
				loading.classList.add("hidden");
				return;
			}

			this.totalDownloadsPages = response.pagination.totalPages;
			this.renderDownloads(response.data, response.pagination);
			content.classList.remove("hidden");
			loading.classList.add("hidden");
		} catch (err) {
			error.textContent = `Erro ao carregar downloads: ${err.message}`;
			error.classList.remove("hidden");
			loading.classList.add("hidden");
		}
	},

	updateDownloadsSortIndicators() {
		const sortBy = document.getElementById("downloads-sort-by").value;
		const sortOrder = document.getElementById("downloads-sort-order").value;

		// Remove all sort indicators
		for (const th of document.querySelectorAll(
			"#downloads-table th.sortable",
		)) {
			th.classList.remove("sorted-asc", "sorted-desc");
		}

		// Add indicator to current sorted column
		const currentTh = document.querySelector(
			`#downloads-table th.sortable[data-sort="${sortBy}"]`,
		);
		if (currentTh) {
			currentTh.classList.add(
				sortOrder === "asc" ? "sorted-asc" : "sorted-desc",
			);
		}
	},

	renderDownloads(data, pagination) {
		const tbody = document.getElementById("downloads-tbody");
		tbody.innerHTML = data
			.map((item) => {
				const statusCode = item.statusCode;
				let badgeClass = "badge-secondary";
				if (statusCode >= 200 && statusCode < 300) {
					badgeClass = "badge-success";
				} else if (statusCode >= 300 && statusCode < 400) {
					badgeClass = "badge-warning";
				} else if (statusCode >= 400) {
					badgeClass = "badge-error";
				}

				const escapedUrl = this.escapeHtml(item.url);
				const userAgent = item.userAgent || "-";
				const truncatedUserAgent =
					userAgent.length > 50
						? `${userAgent.substring(0, 50)}...`
						: userAgent;
				const responseTime = item.responseTime
					? item.responseTime.toLocaleString()
					: "-";
				const rawErrorMessage = item.errorMessage || "";
				const escapedErrorMessage = rawErrorMessage
					? this.escapeHtml(rawErrorMessage)
					: "-";
				const truncatedError =
					escapedErrorMessage.length > 50
						? `${escapedErrorMessage.substring(0, 50)}...`
						: escapedErrorMessage;

				return `
				<tr>
					<td style="font-size: 0.875rem; white-space: nowrap;">
						${new Date(item.timestamp).toLocaleString("pt-BR")}
					</td>
					<td class="truncate" style="max-width: 300px;" title="${escapedUrl}">
						<span class="font-mono">${escapedUrl}</span>
					</td>
					<td class="text-center">
						<span class="badge ${badgeClass}">
							${statusCode}
						</span>
					</td>
					<td class="text-right">${responseTime}</td>
					<td class="truncate" style="max-width: 200px; font-size: 0.875rem;" title="${this.escapeHtml(userAgent)}">
						${this.escapeHtml(truncatedUserAgent)}
					</td>
					<td class="truncate" style="max-width: 200px;" title="${this.escapeHtml(rawErrorMessage || "-")}">
						${truncatedError}
					</td>
				</tr>
			`;
			})
			.join("");

		// Update pagination info
		const paginationInfo = document.getElementById("downloads-pagination-info");
		const startItem = (pagination.page - 1) * pagination.pageSize + 1;
		const endItem = Math.min(
			pagination.page * pagination.pageSize,
			pagination.total,
		);
		paginationInfo.textContent = `Mostrando ${startItem}-${endItem} de ${pagination.total} downloads`;

		const pageInfo = document.getElementById("downloads-page-info");
		pageInfo.textContent = `Página ${pagination.page} de ${pagination.totalPages}`;

		// Update pagination buttons
		const prevBtn = document.getElementById("downloads-prev-btn");
		const nextBtn = document.getElementById("downloads-next-btn");
		prevBtn.disabled = pagination.page <= 1;
		nextBtn.disabled = pagination.page >= pagination.totalPages;

		// Update sort indicators
		this.updateDownloadsSortIndicators();
	},

	async loadProcessing() {
		const limit = document.getElementById("processing-limit").value;
		const loading = document.getElementById("processing-loading");
		const error = document.getElementById("processing-error");
		const content = document.getElementById("processing-content");
		const empty = document.getElementById("processing-empty");

		loading.classList.remove("hidden");
		error.classList.add("hidden");
		content.classList.add("hidden");
		empty.classList.add("hidden");

		try {
			const [overview, errors] = await Promise.all([
				API.getProcessingOverview(),
				API.getProcessingErrors(limit),
			]);

			// Show empty state only if there are no errors AND no processing events at all
			if (overview.total === 0) {
				empty.classList.remove("hidden");
				loading.classList.add("hidden");
				return;
			}

			this.renderProcessing(overview, errors);
			content.classList.remove("hidden");
			loading.classList.add("hidden");
		} catch (err) {
			error.textContent = `Erro ao carregar dados de processamento: ${err.message}`;
			error.classList.remove("hidden");
			loading.classList.add("hidden");
		}
	},

	renderProcessing(overview, errors) {
		// Render stats grid
		const statsGrid = document.getElementById("processing-stats-grid");
		const avgTime = overview.avgProcessingTime
			? `${overview.avgProcessingTime.toLocaleString()} ms`
			: "-";

		statsGrid.innerHTML = `
			<div class="stat-card card-info">
				<div class="stat-label">Total Processados</div>
				<div class="stat-value">${overview.total.toLocaleString()}</div>
			</div>
			<div class="stat-card card-success">
				<div class="stat-label">Sucesso</div>
				<div class="stat-value">${overview.success.toLocaleString()}</div>
			</div>
			<div class="stat-card card-error">
				<div class="stat-label">Falhas</div>
				<div class="stat-value">${overview.failed.toLocaleString()}</div>
			</div>
			<div class="stat-card card-secondary">
				<div class="stat-label">Taxa de Sucesso</div>
				<div class="stat-value">${overview.successRate.toFixed(1)}%</div>
			</div>
			<div class="stat-card card-secondary">
				<div class="stat-label">Tempo Médio</div>
				<div class="stat-value">${avgTime}</div>
			</div>
		`;

		// Render errors table
		const tbody = document.getElementById("processing-tbody");

		if (errors.length === 0) {
			tbody.innerHTML = `
				<tr>
					<td colspan="5" style="text-align: center; padding: 2rem; color: hsl(var(--muted-foreground));">
						Nenhum erro de processamento registrado
					</td>
				</tr>
			`;
			return;
		}

		tbody.innerHTML = errors
			.map((item) => {
				const escapedUrl = this.escapeHtml(item.url);
				const errorType = item.errorType || "-";
				const rawErrorMessage = item.errorMessage || "";
				const escapedErrorMessage = rawErrorMessage
					? this.escapeHtml(rawErrorMessage)
					: '<em style="color: hsl(var(--muted-foreground));">Sem mensagem</em>';
				const processingTime = item.processingTime
					? item.processingTime.toLocaleString()
					: "-";

				return `
				<tr>
					<td style="font-size: 0.875rem; white-space: nowrap;">
						${new Date(item.timestamp).toLocaleString("pt-BR")}
					</td>
					<td class="truncate" style="max-width: 250px;" title="${escapedUrl}">
						<span class="font-mono">${escapedUrl}</span>
					</td>
					<td>
						<span class="badge badge-error">${this.escapeHtml(errorType)}</span>
					</td>
					<td class="truncate" style="max-width: 350px;" title="${this.escapeHtml(rawErrorMessage || "Sem mensagem")}">
						${escapedErrorMessage}
					</td>
					<td class="text-right">${processingTime}</td>
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
