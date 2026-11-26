import type { PluginAPI, PluginTools } from '@ampcode/plugin'

export const description =
	'Removes Git worktrees that Amp created for threads that are now archived. Runs when a thread starts and from the "Clean up archived worktrees" command.'

interface Worktree {
	path: string
	branch?: string
	locked: boolean
}

interface Candidate extends Worktree {
	threadID: string
	configBranch: string
}

export default function (amp: PluginAPI) {
	const $ = amp.$

	async function findCandidates(tools: PluginTools) {
		const root = amp.system.workspaceRoot
		if (!root) return undefined
		const dir = amp.helpers.filePathFromURI(root)
		const common = await $`git -C ${dir} rev-parse --path-format=absolute --git-common-dir`
		if (common.exitCode !== 0) return undefined
		const repo = common.stdout.trim()

		const list = await $`git --git-dir=${repo} worktree list --porcelain`
		const worktrees: Worktree[] = []
		for (const block of list.stdout.trim().split('\n\n')) {
			const lines = block.split('\n')
			const path = lines.find((l) => l.startsWith('worktree '))?.slice('worktree '.length)
			if (!path) continue
			const branch = lines.find((l) => l.startsWith('branch refs/heads/'))?.slice('branch refs/heads/'.length)
			worktrees.push({ path, branch, locked: lines.some((l) => l.startsWith('locked')) })
		}
		// The first entry is the main worktree, which is never removed.
		const main = worktrees.shift()
		if (!main) return undefined

		// Amp records the thread that created each worktree branch as branch.<name>.amp-request.
		const config = await $`git --git-dir=${repo} config --get-regexp ${'^branch\\..*\\.amp-request$'}`
		const threadByBranch = new Map<string, string>()
		for (const line of config.stdout.trim().split('\n')) {
			const match = /^branch\.(.+)\.amp-request (\S+)$/.exec(line)
			if (match) threadByBranch.set(match[1], `T-${match[2]}`)
		}

		// Amp names worktrees <main dir>-<branch>, which still identifies detached-HEAD worktrees.
		const prefix = `${main.path}-`
		const candidates: Candidate[] = []
		for (const wt of worktrees) {
			if (wt.locked || wt.path === dir) continue
			const configBranch = [wt.branch, wt.path.startsWith(prefix) ? wt.path.slice(prefix.length) : undefined].find(
				(b) => b && threadByBranch.has(b),
			)
			if (!configBranch) continue
			const threadID = threadByBranch.get(configBranch)!
			const result = (await tools.call('find_thread', {
				query: `id:${threadID} archived:true`,
				limit: 1,
			})) as { threads?: unknown[] }
			if (result.threads?.length) candidates.push({ ...wt, threadID, configBranch })
		}
		return { repo, candidates }
	}

	async function removeWorktrees(found: NonNullable<Awaited<ReturnType<typeof findCandidates>>>) {
		const { repo, candidates } = found
		const removed: string[] = []
		const skipped: string[] = []
		for (const wt of candidates) {
			// Without --force, git refuses to remove worktrees with uncommitted or untracked changes.
			const rm = await $`git --git-dir=${repo} worktree remove ${wt.path}`
			if (rm.exitCode !== 0) {
				skipped.push(`${wt.path}: ${rm.stderr.trim()}`)
				continue
			}
			removed.push(wt.path)
			// -d keeps branches with commits that aren't merged, so no work is lost.
			if (wt.branch) await $`git --git-dir=${repo} branch -d ${wt.branch}`
			await $`git --git-dir=${repo} config --unset ${`branch.${wt.configBranch}.amp-request`}`
		}
		await $`git --git-dir=${repo} worktree prune`
		return { removed, skipped }
	}

	amp.on('session.start', async (_event, ctx) => {
		const found = await findCandidates(ctx.tools)
		if (!found) return
		const { removed } = await removeWorktrees(found)
		if (removed.length) await ctx.ui.notify(`Removed ${removed.length} worktree(s) from archived threads.`)
	})

	amp.registerCommand(
		'cleanup-archived-worktrees',
		{
			title: 'Clean up archived worktrees',
			category: 'git',
			description: 'Remove worktrees in this repo whose Amp threads are archived',
		},
		async (ctx) => {
			const found = await findCandidates(ctx.tools)
			if (!found?.candidates.length) {
				await ctx.ui.notify('No worktrees from archived threads.')
				return
			}
			const ok = await ctx.ui.confirm({
				title: `Remove ${found.candidates.length} worktree(s) from archived threads?`,
				message: found.candidates.map((c) => `- \`${c.path}\``).join('\n'),
			})
			if (!ok) return
			const { removed, skipped } = await removeWorktrees(found)
			await ctx.ui.notify(
				[`Removed ${removed.length} worktree(s).`, ...(skipped.length ? ['Skipped (uncommitted changes):', ...skipped] : [])].join('\n'),
			)
		},
	)
}
