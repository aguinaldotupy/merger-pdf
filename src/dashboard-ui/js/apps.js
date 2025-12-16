// Apps management module
const AppsManager = {
	apps: [],
	currentAction: null,
	currentAppId: null,
	currentAppDetails: null,

	init() {
		this.setupEventListeners();
	},

	setupEventListeners() {
		// Refresh button
		document
			.getElementById("apps-refresh-btn")
			.addEventListener("click", () => {
				this.loadApps();
			});

		// Create button
		document.getElementById("apps-create-btn").addEventListener("click", () => {
			this.showCreateModal();
		});

		// Create form
		document
			.getElementById("create-app-form")
			.addEventListener("submit", (e) => {
				e.preventDefault();
				this.handleCreateApp();
			});

		// Cancel create
		document
			.getElementById("create-app-cancel")
			.addEventListener("click", () => {
				this.hideCreateModal();
			});

		// Token modal
		document.getElementById("copy-token-btn").addEventListener("click", () => {
			this.copyToken();
		});
		document
			.getElementById("close-token-modal")
			.addEventListener("click", () => {
				this.hideTokenModal();
			});

		// Confirm modal
		document.getElementById("confirm-cancel").addEventListener("click", () => {
			this.hideConfirmModal();
		});
		document.getElementById("confirm-action").addEventListener("click", () => {
			this.executeConfirmedAction();
		});

		// App details modal
		document
			.getElementById("close-app-details-modal")
			.addEventListener("click", () => {
				this.hideDetailsModal();
			});
		document
			.getElementById("app-details-copy-token")
			.addEventListener("click", () => {
				this.copyDetailsToken();
			});
		document
			.getElementById("app-details-regenerate")
			.addEventListener("click", () => {
				if (this.currentAppDetails) {
					this.hideDetailsModal();
					this.confirmRegenerate(
						this.currentAppDetails.id,
						this.currentAppDetails.name,
					);
				}
			});
		document
			.getElementById("app-details-toggle")
			.addEventListener("click", () => {
				if (this.currentAppDetails) {
					this.hideDetailsModal();
					this.confirmToggle(
						this.currentAppDetails.id,
						this.currentAppDetails.name,
						!this.currentAppDetails.isActive,
					);
				}
			});
		document
			.getElementById("app-details-delete")
			.addEventListener("click", () => {
				if (this.currentAppDetails) {
					this.hideDetailsModal();
					this.confirmDelete(
						this.currentAppDetails.id,
						this.currentAppDetails.name,
					);
				}
			});

		// Modal backdrops
		for (const backdrop of document.querySelectorAll(".modal-backdrop")) {
			backdrop.addEventListener("click", (e) => {
				const modal = e.target.closest(".modal");
				if (modal) {
					modal.classList.add("hidden");
				}
			});
		}
	},

	async loadApps() {
		const loading = document.getElementById("apps-loading");
		const error = document.getElementById("apps-error");
		const content = document.getElementById("apps-content");
		const empty = document.getElementById("apps-empty");

		loading.classList.remove("hidden");
		error.classList.add("hidden");
		content.classList.add("hidden");
		empty.classList.add("hidden");

		try {
			this.apps = await AppsAPI.listApps();

			if (!this.apps || this.apps.length === 0) {
				empty.classList.remove("hidden");
				loading.classList.add("hidden");
				return;
			}

			this.renderApps();
			content.classList.remove("hidden");
			loading.classList.add("hidden");
		} catch (err) {
			error.textContent = `Erro ao carregar apps: ${err.message}`;
			error.classList.remove("hidden");
			loading.classList.add("hidden");
		}
	},

	renderApps() {
		const grid = document.getElementById("apps-cards-grid");
		grid.innerHTML = this.apps
			.map((app) => {
				const stats = app.stats || {
					totalJobs: 0,
					completedJobs: 0,
					failedJobs: 0,
					partialJobs: 0,
					successRate: 0,
					lastActivity: null,
				};

				const statusBadge = app.isActive
					? '<span class="badge badge-success">Ativo</span>'
					: '<span class="badge badge-error">Inativo</span>';

				const successRate =
					stats.totalJobs > 0 ? stats.successRate.toFixed(0) : "-";
				let rateClass = "";
				if (stats.totalJobs > 0) {
					if (stats.successRate >= 90) {
						rateClass = "text-success";
					} else if (stats.successRate >= 70) {
						rateClass = "text-warning";
					} else {
						rateClass = "text-danger";
					}
				}

				const lastActivity = stats.lastActivity
					? this.formatRelativeTime(new Date(stats.lastActivity))
					: "Sem atividade";

				return `
				<div class="app-card" onclick="AppsManager.openAppDetails('${app.id}')">
					<div class="app-card-header">
						<div>
							<h3 class="app-card-name">${this.escapeHtml(app.name)}</h3>
							<div class="app-card-token">${app.token.substring(0, 8)}...</div>
						</div>
						${statusBadge}
					</div>
					<div class="app-card-stats">
						<div class="app-card-stat">
							<span class="app-card-stat-value">${stats.totalJobs}</span>
							<span class="app-card-stat-label">Jobs</span>
						</div>
						<div class="app-card-stat">
							<span class="app-card-stat-value text-success">${stats.completedJobs}</span>
							<span class="app-card-stat-label">Sucesso</span>
						</div>
						<div class="app-card-stat">
							<span class="app-card-stat-value text-danger">${stats.failedJobs}</span>
							<span class="app-card-stat-label">Falhas</span>
						</div>
					</div>
					<div class="app-card-footer">
						<span>${lastActivity}</span>
						<div class="app-card-footer-right">
							<span class="${rateClass}" style="font-weight: 600;">
								${successRate !== "-" ? `${successRate}%` : "-"}
							</span>
							<span style="color: hsl(var(--muted-foreground));">taxa</span>
						</div>
					</div>
				</div>
			`;
			})
			.join("");
	},

	formatRelativeTime(date) {
		const now = new Date();
		const diff = now - date;
		const minutes = Math.floor(diff / 60000);
		const hours = Math.floor(diff / 3600000);
		const days = Math.floor(diff / 86400000);

		if (minutes < 1) return "Agora";
		if (minutes < 60) return `${minutes}min atrás`;
		if (hours < 24) return `${hours}h atrás`;
		if (days < 7) return `${days}d atrás`;
		return date.toLocaleDateString("pt-BR");
	},

	escapeHtml(text) {
		const div = document.createElement("div");
		div.textContent = text;
		return div.innerHTML;
	},

	// Open App Details Modal
	async openAppDetails(appId) {
		const modal = document.getElementById("app-details-modal");
		const loading = document.getElementById("app-details-loading");
		const content = document.getElementById("app-details-content");

		modal.classList.remove("hidden");
		loading.classList.remove("hidden");
		content.style.display = "none";

		try {
			const response = await AppsAPI.getApp(appId);
			this.currentAppDetails = response;
			this.renderAppDetails(response);
			loading.classList.add("hidden");
			content.style.display = "block";
		} catch (err) {
			console.error("Failed to load app details:", err);
			this.hideDetailsModal();
			alert("Erro ao carregar detalhes do app");
		}
	},

	renderAppDetails(app) {
		// Name and status
		document.getElementById("app-details-name").textContent = app.name;
		const statusEl = document.getElementById("app-details-status");
		statusEl.textContent = app.isActive ? "Ativo" : "Inativo";
		statusEl.className = `badge ${app.isActive ? "badge-success" : "badge-error"}`;

		// Token
		document.getElementById("app-details-token-value").textContent = app.token;

		// Batch stats
		const batch = app.stats?.batch || {};
		document.getElementById("app-details-batch-total").textContent =
			batch.totalJobs || 0;
		document.getElementById("app-details-batch-completed").textContent =
			batch.completedJobs || 0;
		document.getElementById("app-details-batch-failed").textContent =
			batch.failedJobs || 0;
		document.getElementById("app-details-batch-partial").textContent =
			batch.partialJobs || 0;

		// Downloads stats
		const downloads = app.stats?.downloads || {};
		document.getElementById("app-details-downloads-total").textContent =
			downloads.total || 0;
		document.getElementById("app-details-downloads-success").textContent =
			downloads.success || 0;
		document.getElementById("app-details-downloads-failed").textContent =
			downloads.failed || 0;
		document.getElementById("app-details-downloads-rate").textContent =
			downloads.total > 0 ? `${downloads.successRate.toFixed(1)}%` : "-";
		document.getElementById("app-details-downloads-avg").textContent =
			downloads.avgResponseTime
				? `${Math.round(downloads.avgResponseTime)}ms`
				: "-";

		// Processing stats
		const processing = app.stats?.processing || {};
		document.getElementById("app-details-processing-total").textContent =
			processing.total || 0;
		document.getElementById("app-details-processing-success").textContent =
			processing.success || 0;
		document.getElementById("app-details-processing-failed").textContent =
			processing.failed || 0;
		document.getElementById("app-details-processing-rate").textContent =
			processing.total > 0 ? `${processing.successRate.toFixed(1)}%` : "-";
		document.getElementById("app-details-processing-avg").textContent =
			processing.avgProcessingTime
				? `${Math.round(processing.avgProcessingTime)}ms`
				: "-";

		// Info
		document.getElementById("app-details-created-at").textContent = new Date(
			app.createdAt,
		).toLocaleString("pt-BR");

		const lastActivity =
			batch.lastActivity || downloads.lastDownload || processing.lastProcessing;
		document.getElementById("app-details-last-activity").textContent =
			lastActivity ? new Date(lastActivity).toLocaleString("pt-BR") : "-";

		// Toggle button text
		const toggleBtn = document.getElementById("app-details-toggle");
		toggleBtn.textContent = app.isActive ? "Desativar" : "Ativar";
		toggleBtn.className = app.isActive
			? "btn btn-outline-danger"
			: "btn btn-outline-success";
	},

	hideDetailsModal() {
		document.getElementById("app-details-modal").classList.add("hidden");
		this.currentAppDetails = null;
	},

	async copyDetailsToken() {
		const token = document.getElementById(
			"app-details-token-value",
		).textContent;
		try {
			await navigator.clipboard.writeText(token);
			const btn = document.getElementById("app-details-copy-token");
			const originalText = btn.textContent;
			btn.textContent = "Copiado!";
			btn.classList.add("copy-success");
			setTimeout(() => {
				btn.textContent = originalText;
				btn.classList.remove("copy-success");
			}, 2000);
		} catch (err) {
			console.error("Failed to copy token:", err);
			alert("Falha ao copiar. Selecione e copie manualmente.");
		}
	},

	// Create Modal
	showCreateModal() {
		const modal = document.getElementById("create-app-modal");
		const input = document.getElementById("app-name-input");
		const error = document.getElementById("create-app-error");

		input.value = "";
		error.classList.add("hidden");
		modal.classList.remove("hidden");
		input.focus();
	},

	hideCreateModal() {
		document.getElementById("create-app-modal").classList.add("hidden");
	},

	async handleCreateApp() {
		const input = document.getElementById("app-name-input");
		const error = document.getElementById("create-app-error");
		const name = input.value.trim();

		if (!name || name.length < 3) {
			error.textContent = "Nome deve ter pelo menos 3 caracteres";
			error.classList.remove("hidden");
			return;
		}

		try {
			const result = await AppsAPI.createApp(name);
			this.hideCreateModal();
			this.showTokenModal(result.token);
			this.loadApps();
		} catch (err) {
			error.textContent = err.message || "Erro ao criar app";
			error.classList.remove("hidden");
		}
	},

	// Token Modal
	showTokenModal(token) {
		const modal = document.getElementById("token-modal");
		const tokenDisplay = document.getElementById("generated-token");

		tokenDisplay.textContent = token;
		modal.classList.remove("hidden");
	},

	hideTokenModal() {
		document.getElementById("token-modal").classList.add("hidden");
	},

	async copyToken() {
		const tokenDisplay = document.getElementById("generated-token");
		const token = tokenDisplay.textContent;

		try {
			await navigator.clipboard.writeText(token);
			const btn = document.getElementById("copy-token-btn");
			const originalText = btn.textContent;
			btn.textContent = "Copiado!";
			btn.classList.add("copy-success");
			setTimeout(() => {
				btn.textContent = originalText;
				btn.classList.remove("copy-success");
			}, 2000);
		} catch (err) {
			console.error("Failed to copy token:", err);
			alert("Falha ao copiar. Selecione e copie manualmente.");
		}
	},

	// Confirm Modal
	showConfirmModal(title, description, action, appId) {
		const modal = document.getElementById("confirm-modal");
		const titleEl = document.getElementById("confirm-title");
		const descEl = document.getElementById("confirm-description");
		const error = document.getElementById("confirm-error");
		const actionBtn = document.getElementById("confirm-action");

		titleEl.textContent = title;
		descEl.textContent = description;
		error.classList.add("hidden");

		// Style the confirm button based on action
		actionBtn.className = "btn btn-primary";
		if (action === "delete") {
			actionBtn.className = "btn btn-destructive";
		}

		this.currentAction = action;
		this.currentAppId = appId;
		modal.classList.remove("hidden");
	},

	hideConfirmModal() {
		document.getElementById("confirm-modal").classList.add("hidden");
		this.currentAction = null;
		this.currentAppId = null;
	},

	confirmToggle(appId, appName, activate) {
		const action = activate ? "activate" : "deactivate";
		const title = activate ? "Ativar App" : "Desativar App";
		const description = activate
			? `Tem certeza que deseja ativar o app "${appName}"? O token voltará a funcionar.`
			: `Tem certeza que deseja desativar o app "${appName}"? O token parará de funcionar imediatamente.`;

		this.showConfirmModal(title, description, action, appId);
	},

	confirmRegenerate(appId, appName) {
		this.showConfirmModal(
			"Regenerar Token",
			`Tem certeza que deseja regenerar o token do app "${appName}"? O token atual será invalidado imediatamente.`,
			"regenerate",
			appId,
		);
	},

	confirmDelete(appId, appName) {
		this.showConfirmModal(
			"Excluir App",
			`Tem certeza que deseja excluir o app "${appName}"? Esta ação não pode ser desfeita e todos os batch jobs associados serão perdidos.`,
			"delete",
			appId,
		);
	},

	async executeConfirmedAction() {
		const error = document.getElementById("confirm-error");
		const actionBtn = document.getElementById("confirm-action");
		const originalText = actionBtn.textContent;

		actionBtn.disabled = true;
		actionBtn.textContent = "Processando...";
		error.classList.add("hidden");

		try {
			switch (this.currentAction) {
				case "activate":
				case "deactivate":
					await AppsAPI.toggleAppStatus(this.currentAppId);
					break;
				case "regenerate": {
					const result = await AppsAPI.regenerateToken(this.currentAppId);
					this.hideConfirmModal();
					this.showTokenModal(result.token);
					this.loadApps();
					return;
				}
				case "delete":
					await AppsAPI.deleteApp(this.currentAppId);
					break;
			}

			this.hideConfirmModal();
			this.loadApps();
		} catch (err) {
			error.textContent = err.message || "Erro ao executar ação";
			error.classList.remove("hidden");
		} finally {
			actionBtn.disabled = false;
			actionBtn.textContent = originalText;
		}
	},
};
