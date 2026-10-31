import { ExecError, ServiceLogStream, SpritesClient } from '@fly/sprites';
import { test, vi } from 'vitest';
import { configureRex, registerRexHost, waitForRex } from './rex.ts';

const url = '/Users/test/.ssh/rex-my-dev.sock';
const readyResult = { stdout: '{"sessions":[]}', stderr: '', exitCode: 0 };

test('waits for the loopback listener to accept requests', async ({ expect }) => {
	const sprite = new SpritesClient('test-token').sprite('my-dev');
	const exec = vi
		.spyOn(sprite, 'execFile')
		.mockRejectedValueOnce(
			new ExecError('not ready', { exitCode: 1, stdout: '', stderr: 'connect: connection refused' }),
		)
		.mockResolvedValueOnce(readyResult);
	await expect(waitForRex(sprite, { intervalMs: 0, timeoutMs: 1000 })).resolves.toBeUndefined();
	expect(exec).toHaveBeenCalledTimes(2);
	expect(exec).toHaveBeenLastCalledWith(
		'/usr/bin/rex',
		['--autostart=false', '-S', 'http://127.0.0.1:7297', 'ls', '--json'],
		{ timeout: 10_000 },
	);
});

test('reports unexpected readiness failures instead of polling through them', async ({ expect }) => {
	const sprite = new SpritesClient('test-token').sprite('my-dev');
	const exec = vi
		.spyOn(sprite, 'execFile')
		.mockRejectedValue(new ExecError('permission denied', { exitCode: 1, stdout: '', stderr: 'permission denied' }));
	await expect(waitForRex(sprite)).rejects.toThrow('permission denied');
	expect(exec).toHaveBeenCalledOnce();
});

test('times out if the loopback listener never becomes ready', async ({ expect }) => {
	const sprite = new SpritesClient('test-token').sprite('my-dev');
	vi.spyOn(sprite, 'execFile').mockRejectedValue(
		new ExecError('not ready', { exitCode: 1, stdout: '', stderr: 'connect: connection refused' }),
	);
	await expect(waitForRex(sprite, { intervalMs: 0, timeoutMs: 10 })).rejects.toMatchObject({
		code: 'REX_READY_TIMEOUT',
		fix: expect.stringContaining('--resume --rex'),
	});
});

test('keeps the network listener on loopback and reuses an already-running service', async ({ expect }) => {
	const sprite = new SpritesClient('test-token').sprite('my-dev');
	const list = vi.spyOn(sprite, 'listServices').mockResolvedValue([]);
	vi.spyOn(sprite, 'execFile').mockResolvedValue(readyResult);
	const create = vi
		.spyOn(sprite, 'createService')
		.mockImplementation(async () => new ServiceLogStream(new Response('{"type":"started"}\n')));
	await configureRex(sprite, '/home/sprite');
	const config = create.mock.calls[0]![1];
	expect(config.args).toEqual([
		'server',
		'run',
		'--log-format',
		'text',
		'--state-dir',
		'/home/sprite/.local/state/rex',
		'--extra-listen',
		'http://127.0.0.1:7297',
		'--allow-anonymous',
	]);
	list.mockResolvedValue([{ name: 'rex', needs: [], args: [], ...config, state: { name: 'rex', status: 'running' } }]);
	await configureRex(sprite, '/home/sprite');
	expect(create).toHaveBeenCalledOnce();
});

test('does not overwrite an unrelated service named rex', async ({ expect }) => {
	const sprite = new SpritesClient('test-token').sprite('my-dev');
	vi.spyOn(sprite, 'listServices').mockResolvedValue([
		{ name: 'rex', cmd: '/custom/rex', args: [], dir: '/custom', needs: [] },
	]);
	await expect(configureRex(sprite, '/home/sprite')).rejects.toThrow('different configuration');
});

test('adds a host through the CLI and makes retries idempotent', async ({ expect }) => {
	const hosts: { host: { label: string; endpoints: string[] } }[] = [];
	const execute = vi.fn(async (args: string[]) => {
		if (args.includes('add')) hosts.push({ host: { label: 'my-dev', endpoints: [url] } });
		return JSON.stringify({ hosts });
	});
	await registerRexHost('my-dev', url, execute);
	await registerRexHost('my-dev', url, execute);
	expect(execute.mock.calls.filter(([args]) => args.includes('add'))).toEqual([[['hosts', 'add', 'my-dev', url]]]);
	await expect(registerRexHost('my-dev', 'https://different.example.ts.net', execute)).rejects.toThrow('already uses');
});
