import { setTimeout } from 'node:timers/promises';
import { intro, outro } from '@clack/prompts';
import spawn, { SubprocessError } from 'nano-spawn';
import { diagnostics } from './diagnostics.ts';
import { task } from './output.ts';

interface Session {
	session_id: string;
	label: string;
}

interface Client {
	client_id: string;
	info?: { kind: string };
	connection_state: string;
	session_ids?: string[];
}

async function remoteRex(name: string, args: string[]) {
	try {
		const { stdout } = await spawn('sprite', [
			'exec',
			'-s',
			name,
			'--no-stdin',
			'--no-port-forward',
			'--',
			'/usr/bin/rex',
			'--autostart=false',
			...args,
		]);
		return stdout;
	} catch (error) {
		if (error instanceof SubprocessError && error.stderr) throw new Error(error.stderr, { cause: error });
		throw error;
	}
}

export async function wake(name: string, execute = remoteRex, { timeoutMs = 60_000, intervalMs = 1000 } = {}) {
	const deadline = Date.now() + timeoutMs;
	let app: Client | undefined;
	let appCount = 0;
	while (Date.now() < deadline) {
		let clients: Client[] = [];
		try {
			// oxlint-disable-next-line no-await-in-loop -- Polling also wakes the Sprite while Rex reconnects.
			const result = await execute(name, ['client', 'ls', '--json']);
			({ clients } = JSON.parse(result) as { clients: Client[] });
		} catch (error) {
			if (!(error instanceof Error) || !error.message.includes('rex server is not running')) throw error;
		}
		const apps = clients.filter((client) => client.info?.kind === 'app' && client.connection_state === 'connected');
		appCount = apps.length;
		app = apps.length === 1 ? apps[0] : undefined;
		if (app) break;
		// oxlint-disable-next-line no-await-in-loop -- Wait before checking for the app's next connection attempt.
		await setTimeout(intervalMs);
	}
	if (appCount > 1) throw diagnostics.REX_MULTIPLE_APPS();
	if (!app) throw diagnostics.REX_APP_NOT_CONNECTED({ name });
	const { sessions } = JSON.parse(await execute(name, ['ls', '--json'])) as { sessions: Session[] | null };
	const attached = app.session_ids;
	const existing = sessions?.find((session) => attached?.includes(session.session_id)) ?? sessions?.[0];
	const session = existing ?? {
		...(JSON.parse(await execute(name, ['new', name, '--json'])) as { session_id: string }),
		label: name,
	};
	await execute(name, ['-C', app.client_id, 'do', 'session.select', `session_id=${session.session_id}`]);
	return session;
}

export async function runWake(name: string) {
	intro(`Wake Sprite ${name}`);
	const session = await task('Waking the Sprite and opening Rex…', () => wake(name));
	outro(`Sprite ${name} is awake. Opened Rex session ${session.label || session.session_id}.`);
}
