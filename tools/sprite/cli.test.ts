import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, delimiter } from 'node:path';
import spawn from 'nano-spawn';
import { test } from 'vitest';
import { parseOptions } from './cli.ts';

test.for([
	['unknown'],
	['create', '-bad'],
	['create', 'UPPERCASE'],
	['create', 'a/b'],
	['create', 'a'.repeat(64)],
	['create', 'one', 'two'],
	['create', 'one', '--ref=-bad'],
	['create', 'one', '--typo'],
	['create', 'one', '--account', 'Personal'],
	['create', 'one', '--ref'],
	['create', 'one', '--ref', 'main', '--ref', 'other'],
	['create', 'one', '--', 'two'],
	['upgrade', 'one', 'two'],
	['upgrade', 'UPPERCASE'],
	['upgrade', 'a/b'],
	['upgrade', 'dev', '--typo'],
	['upgrade', 'dev', '--', 'extra'],
	['upgrade', 'dev', '--rex'],
	['wake', 'one', 'two'],
	['wake', 'UPPERCASE'],
	['wake', 'a/b'],
	['wake', 'dev', '--typo'],
	['wake', 'dev', '--', 'extra'],
])('rejects malformed invocation %j before contacting services', async (args, { expect }) => {
	await expect(parseOptions(args)).rejects.toThrow();
});

test.for([
	{ args: ['create'], expected: { command: 'create', name: 'dev', ref: 'main', resume: false, rex: false } },
	{ args: ['create', '--rex'], expected: { command: 'create', name: 'dev', rex: true } },
	{ args: ['create', 'dev'], expected: { command: 'create', name: 'dev', ref: 'main', resume: false, rex: false } },
	{ args: ['create', 'dev', '--resume', '--rex'], expected: { command: 'create', resume: true, rex: true } },
	{ args: ['create', '--', 'dev'], expected: { command: 'create', name: 'dev' } },
	{ args: ['create', 'dev', '--ref', '123'], expected: { ref: '123' } },
	{ args: ['upgrade', 'dev3'], expected: { command: 'upgrade', name: 'dev3' } },
	{ args: ['upgrade', '--', 'dev3'], expected: { command: 'upgrade', name: 'dev3' } },
	{ args: ['upgrade'], expected: { command: 'upgrade', name: 'dev' } },
	{ args: ['wake'], expected: { command: 'wake', name: 'dev' } },
	{ args: ['wake', 'dev3'], expected: { command: 'wake', name: 'dev3' } },
	{ args: ['wake', '--', 'dev3'], expected: { command: 'wake', name: 'dev3' } },
])('parses %j', async ({ args, expected }, { expect }) => {
	await expect(parseOptions(args)).resolves.toMatchObject(expected);
});

test.for([[], ['create'], ['upgrade'], ['wake']])(
	'prints help for %j without contacting services',
	async (args, { expect }) => {
		const { stdout, stderr } = await spawn(process.execPath, ['cli.ts', ...args, '--help'], {
			cwd: import.meta.dirname,
		});
		expect(stdout).toContain('sprite_dev');
		expect(stdout).toContain('Usage:');
		expect(stdout).not.toContain('\u001b');
		expect(stderr).toBe('');
	},
);

test('reports invalid CLI options without terminal status output', async ({ expect }) => {
	await expect(
		spawn(process.execPath, ['cli.ts', 'create', 'dev', '--typo'], { cwd: import.meta.dirname }),
	).rejects.toMatchObject({
		exitCode: 1,
		stderr: expect.stringMatching(/^\[SPRITE_INVALID_OPTIONS\][\s\S]*--help/),
		stdout: '',
	});
});

test('Tab completes commands and flags without starting a workflow', async ({ expect }) => {
	const commands = await spawn(process.execPath, ['cli.ts', 'complete', '--', ''], { cwd: import.meta.dirname });
	expect(commands.stdout).toContain('create\t');
	expect(commands.stdout).toContain('upgrade\t');
	expect(commands.stdout).toContain('wake\t');
	const flags = await spawn(process.execPath, ['cli.ts', 'complete', '--', 'create', '--r'], {
		cwd: import.meta.dirname,
	});
	expect(flags.stdout).toContain('--ref\t');
	expect(flags.stdout).toContain('--resume\t');
	expect(flags.stdout).toContain('--rex\t');
	expect(flags.stdout).not.toContain('\u001b');
	expect(flags.stderr).toBe('');
});

test('completes existing Sprite names for upgrades, wakes, and resumed creates', async ({ expect }) => {
	const directory = await mkdtemp(join(tmpdir(), 'sprite-completions-'));
	try {
		await writeFile(join(directory, 'sprite'), '#!/bin/sh\n[ "$1" = list ] || exit 1\nprintf "dev3\\ndev4\\n"\n', {
			mode: 0o700,
		});
		const options = { cwd: import.meta.dirname, env: { PATH: `${directory}${delimiter}${process.env['PATH']}` } };
		for (const args of [
			['upgrade', 'dev'],
			['wake', 'dev'],
			['create', '--resume', 'dev'],
		]) {
			// oxlint-disable-next-line no-await-in-loop -- Exercise completion contexts with the same fake Sprite CLI.
			const { stdout, stderr } = await spawn(process.execPath, ['cli.ts', 'complete', '--', ...args], options);
			expect(stdout).toContain('dev3\tSprite');
			expect(stdout).toContain('dev4\tSprite');
			expect(stderr).toBe('');
		}
		const { stdout } = await spawn(process.execPath, ['cli.ts', 'complete', '--', 'create', 'dev'], options);
		expect(stdout).not.toContain('dev3');
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
});

test.for([
	{ args: ['wake'], name: 'dev', exitCode: 0 },
	{ args: ['wake', 'other-dev'], name: 'other-dev', exitCode: 0 },
	{ args: ['wake'], name: 'dev', exitCode: 1 },
])('wakes the selected Sprite and propagates failures: %j', async ({ args, name, exitCode }, { expect }) => {
	const directory = await mkdtemp(join(tmpdir(), 'sprite-wake-'));
	try {
		await writeFile(
			join(directory, 'sprite'),
			`#!/bin/sh
[ "$#" -ge 8 ] && [ "$1" = exec ] && [ "$2" = -s ] && [ "$3" = ${name} ] &&
[ "$4" = --no-stdin ] && [ "$5" = --no-port-forward ] && [ "$6" = -- ] &&
[ "$7" = /usr/bin/rex ] && [ "$8" = --autostart=false ] || exit 2
[ ${exitCode} = 0 ] || exit ${exitCode}
shift 8
case "$*" in
  'client ls --json') printf '%s' '{"clients":[{"client_id":"app","info":{"kind":"app"},"connection_state":"connected"}]}' ;;
  'ls --json') printf '%s' '{"sessions":[{"session_id":"session:existing","label":"work"}]}' ;;
  '-C app do session.select session_id=session:existing') printf '%s' null ;;
  *) exit 2 ;;
esac
`,
			{ mode: 0o700 },
		);
		const operation = spawn(process.execPath, ['cli.ts', ...args], {
			cwd: import.meta.dirname,
			env: { PATH: `${directory}${delimiter}${process.env['PATH']}` },
		});
		if (exitCode === 0) {
			const { stdout, stderr } = await operation;
			expect(stdout).toContain(`Sprite ${name} is awake.`);
			expect(stdout).toContain('Opened Rex session work.');
			expect(stderr).toBe('');
		} else {
			await expect(operation).rejects.toMatchObject({
				exitCode: 1,
				stdout: expect.not.stringContaining('is awake'),
			});
		}
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
});
