import spawn from 'nano-spawn';
import { localRex } from './rex.ts';

async function refreshHold(name: string) {
	await spawn(
		'sprite',
		[
			'exec',
			'-s',
			name,
			'--no-stdin',
			'--no-port-forward',
			'--',
			'curl',
			'--fail-with-body',
			'--silent',
			'--show-error',
			'--max-time',
			'10',
			'--unix-socket',
			'/.sprite/api.sock',
			'-H',
			'Content-Type: application/json',
			'-X',
			'PUT',
			'http://sprite/v1/tasks/rex-mac',
			'-d',
			'{"expire":"2m"}',
		],
		{ timeout: 30_000 },
	);
}

export async function autoWake(name: string, execute = localRex, hold = refreshHold) {
	let result: string;
	try {
		result = await execute(['client', 'ls', '--json']);
	} catch (error) {
		if (error instanceof Error && error.message.includes('rex server is not running')) return;
		throw error;
	}
	const { clients } = JSON.parse(result) as {
		clients: {
			info?: { kind: string; platform?: string };
			principal?: { kind: string };
			connection_state?: string;
		}[];
	};
	if (
		clients.some(
			(client) =>
				client.info?.kind === 'app' &&
				client.info.platform === 'macos' &&
				client.principal?.kind === 'peer' &&
				client.connection_state !== 'lost',
		)
	)
		await hold(name);
}

if (import.meta.main) {
	try {
		await autoWake(process.argv[2] ?? 'dev');
	} catch (error) {
		console.error(error);
		process.exitCode = 1;
	}
}
