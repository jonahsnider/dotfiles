import { setTimeout } from 'node:timers/promises';
import { intro, outro } from '@clack/prompts';
import spawn, { SubprocessError } from 'nano-spawn';
import { diagnostics } from './diagnostics.ts';
import { startKeepAwake } from './keepawake.ts';
import { task } from './output.ts';

interface Session {
	session_id: string;
	label: string;
}

interface Client {
	client_id: string;
	info?: { kind: string };
	principal?: { kind: string; user_id?: string; node?: string };
	connected_at?: string;
	connection_state: string;
	session_ids?: string[];
}

function chooseApp(apps: Client[]) {
	if (apps.length < 2) return apps[0];
	const device = apps[0]!.principal;
	if (!device?.user_id || !device.node || device.kind !== 'tailscale') return undefined;
	if (
		!apps.every(
			(app) =>
				app.principal?.kind === device.kind &&
				app.principal.user_id === device.user_id &&
				app.principal.node === device.node &&
				Number.isFinite(Date.parse(app.connected_at ?? '')),
		)
	)
		return undefined;
	// Rex can retain a connected entry from before sleep alongside the Mac's new connection.
	const sorted = apps.toSorted((a, b) => Date.parse(b.connected_at!) - Date.parse(a.connected_at!));
	return Date.parse(sorted[0]!.connected_at!) !== Date.parse(sorted[1]!.connected_at!) ? sorted[0] : undefined;
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

export async function wake(
	name: string,
	execute = remoteRex,
	{
		timeoutMs = 60_000,
		intervalMs = 1000,
		keepAwake,
	}: { timeoutMs?: number; intervalMs?: number; keepAwake?: (name: string) => Promise<void> } = {},
) {
	const deadline = Date.now() + timeoutMs;
	let appCount = 0;
	let session: Session | undefined;
	let selectionError: Error | undefined;
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
		const app = chooseApp(apps);
		if (app) {
			if (!session) {
				// oxlint-disable-next-line no-await-in-loop -- Resolve the session once, even if the app reconnects.
				const { sessions } = JSON.parse(await execute(name, ['ls', '--json'])) as { sessions: Session[] | null };
				session = sessions?.find((candidate) => app.session_ids?.includes(candidate.session_id)) ?? sessions?.[0];
				if (!session) {
					session = {
						// oxlint-disable-next-line no-await-in-loop -- A reconnect must not create a duplicate session.
						...(JSON.parse(await execute(name, ['new', name, '--json'])) as { session_id: string }),
						label: name,
					};
				}
			}
			try {
				// oxlint-disable-next-line no-await-in-loop -- A timed-out app may be replaced by its new connection.
				await execute(name, ['-C', app.client_id, 'do', 'session.select', `session_id=${session.session_id}`]);
			} catch (error) {
				if (
					!(error instanceof Error) ||
					(!error.message.includes('did not answer within') &&
						!error.message.includes(`client ${app.client_id} not found`))
				)
					throw error;
				selectionError = error;
				// oxlint-disable-next-line no-await-in-loop -- Allow the app's reconnect to become visible before retrying.
				await setTimeout(intervalMs);
				continue;
			}
			// oxlint-disable-next-line no-await-in-loop -- Start the helper only after session selection succeeds.
			await keepAwake?.(name);
			return session;
		}
		// oxlint-disable-next-line no-await-in-loop -- Wait before checking for the app's next connection attempt.
		await setTimeout(intervalMs);
	}
	if (selectionError) throw selectionError;
	if (appCount > 1) throw diagnostics.REX_MULTIPLE_APPS();
	throw diagnostics.REX_APP_NOT_CONNECTED({ name });
}

export async function runWake(name: string) {
	intro(`Wake Sprite ${name}`);
	const session = await task('Waking the Sprite and opening Rex…', () =>
		wake(name, remoteRex, { keepAwake: startKeepAwake }),
	);
	outro(`Sprite ${name} is awake. Opened Rex session ${session.label || session.session_id}.`);
}
