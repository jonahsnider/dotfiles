import { existsSync } from 'node:fs';
import { delimiter, join } from 'node:path';
import { setTimeout } from 'node:timers/promises';
import { ExecError, type Sprite, type ServiceRequest, type ServiceLogStream } from '@fly/sprites';
import spawn from 'nano-spawn';
import { diagnostics } from './diagnostics.ts';

const rexEndpoint = 'http://127.0.0.1:7297';

export async function waitForRex(sprite: Sprite, { timeoutMs = 30_000, intervalMs = 500 } = {}) {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		try {
			// oxlint-disable-next-line no-await-in-loop -- Wait for the supervised HTTP listener to accept requests.
			await sprite.execFile('/usr/bin/rex', ['--autostart=false', '-S', rexEndpoint, 'ls', '--json'], {
				timeout: 10_000,
			});
			return;
		} catch (error) {
			// The supervised process can start before its local socket is ready.
			if (
				!(error instanceof ExecError) ||
				error.exitCode !== 1 ||
				!error.stderr.toString().includes('connection refused')
			)
				throw error;
		}
		// oxlint-disable-next-line no-await-in-loop -- Delay before the next readiness poll.
		await setTimeout(intervalMs);
	}
	throw diagnostics.REX_READY_TIMEOUT();
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
			'--extra-listen',
			rexEndpoint,
			'--allow-anonymous',
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

async function localRex(args: string[]) {
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
