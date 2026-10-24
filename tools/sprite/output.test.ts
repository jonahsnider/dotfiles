import spawn from 'nano-spawn';
import { test } from 'vitest';

test('keeps successful install output quiet when redirected, without cursor controls', async ({ expect }) => {
	const { stdout, stderr } = await spawn(
		process.execPath,
		[
			'--input-type=module',
			'-e',
			`
				import { task } from './output.ts';
				const result = await task('Installing tools…', async (output) => {
					output('noisy install output\\n');
					await new Promise(resolve => setTimeout(resolve, 200));
					return 'ready';
				});
				console.log(result);
			`,
		],
		{ cwd: import.meta.dirname },
	);
	expect(stdout).toContain('Installing tools');
	expect(stdout).toContain('ready');
	expect(stdout).not.toContain('noisy install output');
	expect(stdout).not.toContain('\u001b');
	expect(stderr).toBe('');
});

test.for([false, true])('retains a failed install’s complete output with isTTY=%s', async (isTTY, { expect }) => {
	const failure = spawn(
		process.execPath,
		[
			'--input-type=module',
			'-e',
			`
				import { SpriteCommand, SpritesClient } from '@fly/sprites';
				import { provision } from './create.ts';
				import { formatException } from './diagnostics.ts';
				process.stdout.isTTY = ${isTTY};
				process.stdout.columns = 80;
				const sprite = new SpritesClient('test-token').sprite('test-sprite');
				sprite.execFile = async () => ({ stdout: '/home/sprite\\n', stderr: '', exitCode: 0 });
				sprite.filesystem = () => ({ writeFile: async () => {}, chmod: async () => {} });
				sprite.spawn = () => {
					const child = new SpriteCommand(sprite, 'bash');
					child.close = () => {};
					child.wait = async () => {
						for (let line = 0; line < 10; line++) child.stdout.write('install line ' + line + '\\n');
						child.stderr.write('package install failed\\n');
						return 42;
					};
					queueMicrotask(() => child.emit('spawn'));
					return child;
				};
				try {
					await provision(sprite, 'test-service-account-token', 'main');
				} catch (error) {
					console.error(formatException(error));
					process.exitCode = 1;
				}
			`,
		],
		{ cwd: import.meta.dirname },
	);
	await expect(failure).rejects.toMatchObject({
		exitCode: 1,
		stdout: expect.stringContaining('install line 0'),
		stderr: expect.stringMatching(/SPRITE_REMOTE_COMMAND_FAILED[\s\S]*status 42/),
	});
	await expect(failure).rejects.toHaveProperty('stdout', expect.stringContaining('install line 9'));
	await expect(failure).rejects.toHaveProperty('stdout', expect.stringContaining('package install failed'));
	const { stdout } = await failure.catch((error: { stdout: string }) => error);
	const failureOutput = stdout.slice(stdout.lastIndexOf('Installing mise…'));
	expect(failureOutput).toContain('install line 0');
	expect(failureOutput).toContain('install line 9');
});
