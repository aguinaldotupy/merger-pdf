module.exports = {
	apps: [
		{
			name: "merger-pdf-api",
			script: "dist/index.js",
			instances: 2,
			autorestart: true,
			watch: false,
			max_memory_restart: "1G",
			env: {
				NODE_ENV: "production",
				PORT: 3333,
			},
		},
	],
};
