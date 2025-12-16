/**
 * @type {import('semantic-release').GlobalConfig}
 */
module.exports = {
	branches: ["main", { name: "stage", prerelease: true, channel: "stage" }],
	plugins: [
		"@semantic-release/changelog",
		[
			"@semantic-release/commit-analyzer",
			{
				preset: "angular",
				releaseRules: [
					{ type: "feat", release: "minor" },
					{ type: "refactor", release: "patch" },
					{ type: "style", release: "patch" },
				],
			},
		],
		"@semantic-release/release-notes-generator",
		[
			"@semantic-release/npm",
			{
				npmPublish: false,
			},
		],
		[
			"@semantic-release/git",
			{
				assets: ["CHANGELOG.md", "package.json", "bun.lockb"],
				message:
					"chore(release): ${nextRelease.version} \n\n${nextRelease.notes}",
			},
		],
		[
			"@semantic-release/github",
			{
				assets: [
					{ path: "dist/index.js", label: "Main server entry point" },
					{ path: "dist/pdf-merger.js", label: "PDF Merger library" },
					{ path: "dist/merge-cli.js", label: "CLI tool" },
					{ path: "dist/env.js", label: "Environment config" },
					{ path: "dist/utils.js", label: "Utilities" },
				],
			},
		],
		[
			"@semantic-release/exec",
			{
				publishCmd:
					'if [ -n "$GITHUB_OUTPUT" ]; then echo "new_release_published=true" >> $GITHUB_OUTPUT && echo "new_release_version=${nextRelease.version}" >> $GITHUB_OUTPUT && echo "version=v${nextRelease.version}" >> $GITHUB_OUTPUT; else echo "Skipping GITHUB_OUTPUT (not in GitHub Actions)"; fi',
			},
		],
	],
};
