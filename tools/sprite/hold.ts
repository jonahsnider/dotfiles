// This runs in the Sprite, so we only use builtin Node APIs

import { spawn, spawnSync } from 'node:child_process';
import { constants } from 'node:os';
import { parseArgs } from 'node:util';

const task = `agent-${process.pid}`;

function request(method: 'PUT' | 'DELETE') {
	return spawnSync(
		'curl',
		[
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
			method,
			`http://sprite/v1/tasks/${task}`,
			...(method === 'PUT' ? ['-d', '{"expire":"5m"}'] : []),
		],
		{ stdio: ['ignore', 'ignore', 'inherit'], timeout: 15_000 },
	);
}

const {
	positionals: [command, ...args],
} = parseArgs({
	// Every argument belongs to the child command, including its flags.
	args: ['--', ...process.argv.slice(2)],
	allowPositionals: true,
});
if (!command) {
	console.error('Usage: sprite_hold <command> [args...] (run inside a Sprite)');
	process.exit(1);
}

const initial = request('PUT');
if (initial.error || initial.status !== 0) {
	console.error('Could not hold the Sprite awake; command was not started.');
	process.exit(1);
}

const child = spawn(command, args, { stdio: 'inherit' });
const heartbeat = setInterval(() => {
	const result = request('PUT');
	if (result.error || result.status !== 0) console.error('Sprite hold renewal failed; retrying in one minute.');
}, 60_000);

function finish(code: number) {
	clearInterval(heartbeat);
	request('DELETE');
	process.exitCode = code;
}

// The terminal delivers Ctrl-C to the agent too. Keep the wrapper alive while
// an interactive agent handles it; forwarding it would interrupt the agent twice.
process.on('SIGINT', () => {});
process.on('SIGTERM', () => child.kill('SIGTERM'));
child.once('error', (error) => {
	console.error(error);
	finish(1);
});
child.once('exit', (code, signal) => finish(code ?? 128 + (signal ? constants.signals[signal] : 0)));
