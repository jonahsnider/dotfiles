import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, delimiter } from 'node:path';
import spawn from 'nano-spawn';
import { log } from '@clack/prompts';
import oscStatus from 'osc-status';
import { test, vi, type TestContext } from 'vitest';
import { runCli } from './cli.ts';
import * as createModule from './create.ts';
import * as upgradeModule from './upgrade.ts';

function fixture({ onTestFinished }: TestContext) {
	const mocks = {
		create: vi.spyOn(createModule, 'create').mockResolvedValue(undefined),
		upgrade: vi.spyOn(upgradeModule, 'runUpgrade').mockResolvedValue(undefined),
		done: vi.spyOn(oscStatus, 'done').mockReturnValue(false),
		error: vi.spyOn(oscStatus, 'error').mockReturnValue(false),
		consoleError: vi.spyOn(console, 'error').mockImplementation(() => {}),
		logError: vi.spyOn(log, 'error').mockImplementation(() => {}),
	};
	onTestFinished(() => {
		for (const mock of Object.values(mocks)) mock.mockRestore();
	});
	return mocks;
}

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
	['wake'],
])('rejects malformed invocation %j before contacting services', { concurrent: false }, async (args, context) => {
	const { expect } = context;
	const { create, upgrade, consoleError, error } = fixture(context);
	await expect(runCli(args)).resolves.toBe(1);
	expect(create).not.toHaveBeenCalled();
	expect(upgrade).not.toHaveBeenCalled();
	expect(consoleError).toHaveBeenCalledOnce();
	expect(error).not.toHaveBeenCalled();
});

test.for([
	{ args: ['create'], expected: { name: 'dev', ref: 'main', resume: false, rex: false } },
	{ args: ['create', '--rex'], expected: { name: 'dev', rex: true } },
	{ args: ['create', 'a'.repeat(63), '--rex'], expected: { name: 'a'.repeat(63), rex: true } },
	{ args: ['create', 'a'.repeat(63)], expected: { name: 'a'.repeat(63), rex: false } },
	{ args: ['create', 'dev'], expected: { name: 'dev', ref: 'main', resume: false, rex: false } },
	{ args: ['create', 'dev', '--resume', '--rex'], expected: { resume: true, rex: true } },
	{ args: ['create', '--', 'dev'], expected: { name: 'dev' } },
	{ args: ['create', 'dev', '--ref', '123'], expected: { ref: '123' } },
])('runs create for %j', { concurrent: false }, async ({ args, expected }, context) => {
	const { expect } = context;
	const { create, upgrade, done, error } = fixture(context);
	await expect(runCli(args)).resolves.toBe(0);
	expect(create).toHaveBeenCalledExactlyOnceWith(expect.objectContaining(expected));
	expect(upgrade).not.toHaveBeenCalled();
	expect(done).toHaveBeenCalledOnce();
	expect(error).not.toHaveBeenCalled();
});

test.for([
	{ args: ['upgrade', 'dev3'], name: 'dev3' },
	{ args: ['upgrade', '--', 'dev3'], name: 'dev3' },
	{ args: ['upgrade'], name: 'dev' },
])('runs upgrade for %j', { concurrent: false }, async ({ args, name }, context) => {
	const { expect } = context;
	const { create, upgrade, done, error } = fixture(context);
	await expect(runCli(args)).resolves.toBe(0);
	expect(upgrade).toHaveBeenCalledExactlyOnceWith(name);
	expect(create).not.toHaveBeenCalled();
	expect(done).toHaveBeenCalledOnce();
	expect(error).not.toHaveBeenCalled();
});

test.for(['create', 'upgrade'] as const)(
	'reports a failed %s workflow',
	{ concurrent: false },
	async (command, context) => {
		const { expect } = context;
		const mocks = fixture(context);
		mocks[command].mockRejectedValueOnce(new Error('connection failed'));
		await expect(runCli([command])).resolves.toBe(1);
		expect(mocks.error).toHaveBeenCalledOnce();
		expect(mocks.done).not.toHaveBeenCalled();
		expect(mocks.logError).toHaveBeenCalledWith(expect.stringContaining('connection failed'));
		expect(mocks.consoleError).not.toHaveBeenCalled();
	},
);

test.for([[], ['create'], ['upgrade']])('prints help for %j without contacting services', async (args, { expect }) => {
	const { stdout, stderr } = await spawn(process.execPath, ['cli.ts', ...args, '--help'], {
		cwd: import.meta.dirname,
	});
	expect(stdout).toContain('sprite_dev');
	expect(stdout).toContain('USAGE');
	expect(stdout).not.toContain('\u001b');
	expect(stderr).toBe('');
});

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
	expect(commands.stdout).not.toContain('wake\t');
	const flags = await spawn(process.execPath, ['cli.ts', 'complete', '--', 'create', '--r'], {
		cwd: import.meta.dirname,
	});
	expect(flags.stdout).toContain('--ref\t');
	expect(flags.stdout).toContain('--resume\t');
	expect(flags.stdout).toContain('--rex\t');
	expect(flags.stdout).not.toContain('\u001b');
	expect(flags.stderr).toBe('');
});

test('completes existing Sprite names for upgrades and resumed creates', async ({ expect }) => {
	const directory = await mkdtemp(join(tmpdir(), 'sprite-completions-'));
	try {
		await writeFile(join(directory, 'sprite'), '#!/bin/sh\n[ "$1" = list ] || exit 1\nprintf "dev3\\ndev4\\n"\n', {
			mode: 0o700,
		});
		const options = { cwd: import.meta.dirname, env: { PATH: `${directory}${delimiter}${process.env['PATH']}` } };
		for (const args of [
			['upgrade', 'dev'],
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
