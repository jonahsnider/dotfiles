import { existsSync } from 'node:fs';
import { delimiter, join } from 'node:path';
import { setTimeout } from 'node:timers/promises';
import { log as clackLog } from '@clack/prompts';
import { ExecError, type Sprite, type ServiceRequest, type ServiceLogStream } from '@fly/sprites';
import spawn from 'nano-spawn';
import oscStatus from 'osc-status';
import { diagnostics } from './diagnostics.ts';

interface RexStatus {
	tailscale: {
		state: string;
		auth_url?: string;
		error?: string;
		https?: { state: string; url?: string };
	};
}

export async function waitForRex(
	sprite: Sprite,
	{ timeoutMs = 300_000, intervalMs = 2000, log = clackLog.info, status: reportStatus = oscStatus } = {},
) {
	const deadline = Date.now() + timeoutMs;
	let authURL: string | undefined;
	let needsApproval = false;
	while (Date.now() < deadline) {
		let status: RexStatus | undefined;
		try {
			// oxlint-disable-next-line no-await-in-loop -- Each poll depends on the preceding server state.
			const { stdout } = await sprite.execFile('/usr/bin/rex', ['--autostart=false', 'server', 'status', '--json'], {
				timeout: 10_000,
			});
			status = JSON.parse(stdout.toString()) as RexStatus;
		} catch (error) {
			// The supervised process can start before its local socket is ready.
			if (
				!(error instanceof ExecError) ||
				error.exitCode !== 1 ||
				!error.stderr.toString().includes('rex server is not running')
			)
				throw error;
		}
		const tailscale = status?.tailscale;
		if (tailscale?.error) throw diagnostics.REX_TAILSCALE_FAILED({ message: tailscale.error });
		if (tailscale?.auth_url && tailscale.auth_url !== authURL) {
			authURL = tailscale.auth_url;
			log(`Sign this Sprite into the same Tailscale account as Rex on your MacBook:\n${authURL}`);
			reportStatus.blocked({
				app: 'dotfiles-sprite',
				kind: 'auth',
				message: 'Sign the Sprite into Tailscale using the printed authorization link.',
			});
		}
		if (tailscale?.state === 'needs_machine_approval' && !needsApproval) {
			needsApproval = true;
			log('A Tailscale administrator must approve the Sprite device.');
			reportStatus.blocked({
				app: 'dotfiles-sprite',
				kind: 'permission',
				message: 'A Tailscale administrator must approve the Sprite device.',
			});
		}
		if (tailscale?.state === 'running')
			reportStatus.working({ app: 'dotfiles-sprite', message: 'Waiting for Rex HTTPS…' });
		if (tailscale?.state === 'running' && tailscale.https?.state === 'available' && tailscale.https.url) {
			return tailscale.https.url;
		}
		// oxlint-disable-next-line no-await-in-loop -- Delay before the next readiness poll.
		await setTimeout(intervalMs);
	}
	throw diagnostics.REX_HTTPS_TIMEOUT();
}

export async function configureRex(sprite: Sprite, home: string) {
	const config: ServiceRequest = {
		cmd: '/usr/bin/rex',
		args: [
			'server',
			'run',
			'--log-format',
			'text',
			'--state-dir',
			`${home}/.local/state/rex`,
			'--tailscale',
			'--tailscale-hostname',
			`jonah-sprite-${sprite.name}`,
		],
		dir: home,
		env: { HOME: home, USER: 'sprite', LOGNAME: 'sprite', SHELL: '/usr/bin/fish', GODEBUG: '' },
	};
	const existing = (await sprite.listServices()).find((service) => service.name === 'rex');
	if (
		existing &&
		(existing.cmd !== config.cmd ||
			existing.dir !== home ||
			JSON.stringify(existing.args) !== JSON.stringify(config.args) ||
			Object.entries(config.env ?? {}).some(([key, value]) => existing.env?.[key] !== value))
	)
		throw diagnostics.REX_SERVICE_CONFLICT();
	let events: ServiceLogStream | undefined;
	if (!existing) {
		events = await sprite.createService('rex', config, '1s');
	} else if (existing.state?.status !== 'running' && existing.state?.status !== 'starting') {
		events = await sprite.startService('rex', '1s');
	}
	if (events) {
		try {
			for await (const event of events) {
				if (event.type === 'error' || event.type === 'exit') {
					throw diagnostics.REX_SERVICE_FAILED({ detail: event.data ?? event.exitCode ?? event.type });
				}
			}
		} finally {
			events.close();
		}
	}
	return waitForRex(sprite);
}

export async function localRex(args: string[]) {
	const candidates = [
		...(process.env['REX_BIN_DIR'] ? [join(process.env['REX_BIN_DIR'], 'rex')] : []),
		...(process.env['PATH']
			?.split(delimiter)
			.filter(Boolean)
			.map((dir) => join(dir, 'rex')) ?? []),
		'/Applications/Rex Beta.app/Contents/Helpers/Rex Server.rex/Contents/MacOS/rex',
	];
	const executable = candidates.find((candidate) => existsSync(candidate));
	if (!executable) throw diagnostics.REX_CLI_NOT_FOUND();
	const { stdout } = await spawn(executable, ['--autostart=false', ...args]);
	return stdout;
}

export async function registerRexHost(name: string, url: string, execute = localRex) {
	const { hosts } = JSON.parse(await execute(['hosts', '--json'])) as {
		hosts: { host: { label: string; endpoints: string[] } }[];
	};
	const existing = hosts.find(({ host }) => host.label.toLowerCase() === name.toLowerCase());
	if (existing) {
		if (existing.host.endpoints.includes(url)) return;
		throw diagnostics.REX_HOST_CONFLICT({ name });
	}
	await execute(['hosts', 'add', name, url]);
}
