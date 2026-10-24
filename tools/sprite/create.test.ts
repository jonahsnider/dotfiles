import { SpriteCommand, SpritesClient } from '@fly/sprites';
import { test, vi } from 'vitest';
import { provision } from './create.ts';

function fixture() {
	const sprite = new SpritesClient('test-api-token').sprite('test-sprite');
	const fs = sprite.filesystem('/home/sprite');
	const child = new SpriteCommand(sprite, 'bash');

	vi.spyOn(sprite, 'filesystem').mockReturnValue(fs);
	const exec = vi.spyOn(sprite, 'execFile').mockResolvedValue({ stdout: '/home/sprite\n', stderr: '', exitCode: 0 });
	const write = vi.spyOn(fs, 'writeFile').mockResolvedValue(undefined);
	const chmod = vi.spyOn(fs, 'chmod').mockResolvedValue(undefined);
	const spawn = vi.spyOn(sprite, 'spawn').mockImplementation(() => {
		queueMicrotask(() => child.emit('spawn'));
		return child;
	});
	const wait = vi.spyOn(child, 'wait').mockResolvedValue(0);
	const close = vi.spyOn(child, 'close').mockImplementation(() => {});
	const reportProgress = vi.fn<(message: string) => void>();
	const setup = (token: string, ref: string) => provision(sprite, token, ref, reportProgress);
	return { child, exec, write, chmod, spawn, wait, close, reportProgress, setup };
}

test('transfers credentials with private permissions and keeps secrets out of command arguments', async ({
	expect,
}) => {
	const { setup, child, exec, write, chmod, spawn, close, reportProgress } = fixture();
	const secret = 'test-service-account-token';
	await setup(secret, 'feature/dev');
	expect(write).toHaveBeenCalledWith('.config/op/service-account-token', secret, { mode: 0o600 });
	expect(chmod).toHaveBeenCalledWith('.config/op/service-account-token', 0o600);
	expect(write).toHaveBeenCalledWith('.local/share/dotfiles/mise.toml', expect.stringContaining('ref = "feature/dev"'));
	expect(JSON.stringify([...exec.mock.calls, ...spawn.mock.calls])).not.toContain(secret);
	expect(child.stdin.writableEnded).toBe(true);
	expect(close).toHaveBeenCalledTimes(spawn.mock.calls.length);
	expect(reportProgress).toHaveBeenNthCalledWith(1, expect.stringContaining('Preparing credentials'));
	expect(reportProgress).toHaveBeenLastCalledWith(expect.stringContaining('Installing Rex'));
});

test('rejects an empty service-account token before making remote changes', async ({ expect }) => {
	const { setup, exec, write, spawn } = fixture();
	await expect(setup(' \n', 'main')).rejects.toThrow('token is empty');
	expect(exec).not.toHaveBeenCalled();
	expect(write).not.toHaveBeenCalled();
	expect(spawn).not.toHaveBeenCalled();
});

test('does not run the bootstrap when credential transfer fails', async ({ expect }) => {
	const { setup, write, spawn } = fixture();
	write.mockRejectedValue(new Error('upload failed'));
	await expect(setup('test-token', 'main')).rejects.toThrow('upload failed');
	expect(spawn).not.toHaveBeenCalled();
});

test('reports failed remote installation and closes the connection', async ({ expect }) => {
	const { setup, wait, close } = fixture();
	wait.mockResolvedValue(42);
	await expect(setup('test-token', 'main')).rejects.toMatchObject({
		code: 'SPRITE_REMOTE_COMMAND_FAILED',
		message: expect.stringContaining('status 42'),
	});
	expect(close).toHaveBeenCalledOnce();
});

test('does not apply dotfiles when declarative prerequisite installation fails', async ({ expect }) => {
	const { setup, child, write, spawn, wait } = fixture();
	spawn.mockImplementation((_command, args) => {
		wait.mockResolvedValue(args?.includes('bootstrap') ? 42 : 0);
		queueMicrotask(() => child.emit('spawn'));
		return child;
	});
	await expect(setup('test-token', 'main')).rejects.toThrow('status 42');
	expect(write).not.toHaveBeenCalledWith('.config/chezmoi/chezmoi.toml', expect.anything());
});

test(
	'rejects connection errors instead of waiting forever for an exit event',
	{ timeout: 1000 },
	async ({ expect }) => {
		const { setup, child, close, wait, spawn } = fixture();
		wait.mockReturnValue(new Promise<number>(() => {}));
		spawn.mockImplementation(() => {
			queueMicrotask(() => child.emit('error', new Error('connection lost')));
			return child;
		});
		await expect(setup('test-token', 'main')).rejects.toThrow('connection lost');
		expect(close).toHaveBeenCalledOnce();
	},
);
