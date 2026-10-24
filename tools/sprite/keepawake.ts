import { spawn } from 'node:child_process';
import { mkdtemp, open, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout } from 'node:timers/promises';
import { diagnostics } from './diagnostics.ts';

export async function startKeepAwake(name: string) {
	const script = await readFile(new URL('../../private_dot_config/rex/sprite-keepawake.lua', import.meta.url), 'utf8');
	const directory = await mkdtemp(join(tmpdir(), 'sprite-rex-keepawake-'));
	const log = join(directory, 'output.log');
	const output = await open(log, 'w', 0o600);
	const child = spawn(
		'sprite',
		[
			'exec',
			'-s',
			name,
			'--no-stdin',
			'--no-port-forward',
			'--',
			'sh',
			'-c',
			'exec flock -n -E 0 "$HOME/.local/state/rex/sprite-keepawake.lock" /usr/bin/rex --autostart=false do -e "$1" --all',
			'sh',
			script,
		],
		{ detached: true, stdio: ['ignore', output.fd, output.fd] },
	);
	let failure: Error | undefined;
	let exited = false;
	let code: number | null = null;
	child.once('error', (error) => {
		failure = error;
	});
	child.once('exit', (exitCode) => {
		exited = true;
		code = exitCode;
	});
	await output.close();
	const deadline = Date.now() + 20_000;
	while (Date.now() < deadline) {
		// oxlint-disable-next-line no-await-in-loop -- Wait for remote readiness before detaching the local CLI.
		const text = await readFile(log, 'utf8');
		if (failure || (exited && code !== 0)) break;
		// flock exits successfully when another wake already owns the keep-awake process.
		if ((exited && code === 0) || text.includes('sprite-rex-keepawake ready')) {
			child.unref();
			return;
		}
		// oxlint-disable-next-line no-await-in-loop -- Delay before checking the startup log again.
		await setTimeout(100);
	}
	child.kill();
	throw diagnostics.REX_KEEP_AWAKE_FAILED({ log, cause: failure });
}
