import { ExecError, ServiceLogStream, SpritesClient } from '@fly/sprites';
import oscStatus from 'osc-status';
import { test, vi } from 'vitest';
import { configureRex, registerRexHost, waitForRex } from './rex.ts';

const url = 'https://my-dev.example.ts.net';
const ready = { tailscale: { state: 'running', https: { state: 'available', url } } };
const readyResult = { stdout: JSON.stringify(ready), stderr: '', exitCode: 0 };

test('waits through login and certificate provisioning for the actual HTTPS URL', async ({ expect }) => {
	const sprite = new SpritesClient('test-token').sprite('my-dev');
	const log = vi.fn();
	const status = { ...oscStatus, blocked: vi.fn().mockReturnValue(false), working: vi.fn().mockReturnValue(false) };
	const states = [
		{ tailscale: { state: 'needs_login', auth_url: 'https://login.tailscale.com/test' } },
		{ tailscale: { state: 'needs_machine_approval' } },
		{ tailscale: { state: 'running', dns_name: 'my-dev.example.ts.net', https: { state: 'pending' } } },
		ready,
	];
	const exec = vi.spyOn(sprite, 'execFile');
	for (const state of states) {
		exec.mockResolvedValueOnce({ stdout: JSON.stringify(state), stderr: '', exitCode: 0 });
	}
	await expect(waitForRex(sprite, { intervalMs: 0, timeoutMs: 1000, log, status })).resolves.toBe(url);
	expect(exec).toHaveBeenCalledTimes(states.length);
	expect(log).toHaveBeenCalledWith(expect.stringContaining('https://login.tailscale.com/test'));
	expect(status.blocked).toHaveBeenNthCalledWith(1, expect.objectContaining({ kind: 'auth' }));
	expect(status.blocked).toHaveBeenNthCalledWith(2, expect.objectContaining({ kind: 'permission' }));
	expect(status.working).toHaveBeenCalled();
});

test('retries a socket that is not ready and reports Tailscale failures', async ({ expect }) => {
	const sprite = new SpritesClient('test-token').sprite('my-dev');
	vi.spyOn(sprite, 'execFile')
		.mockRejectedValueOnce(
			new ExecError('server not ready', { exitCode: 1, stdout: '', stderr: 'rex server is not running' }),
		)
		.mockResolvedValueOnce({
			stdout: JSON.stringify({ tailscale: { state: 'disabled', error: 'HTTPS is disabled on this tailnet' } }),
			stderr: '',
			exitCode: 0,
		});
	await expect(waitForRex(sprite, { intervalMs: 0, timeoutMs: 1000 })).rejects.toThrow('HTTPS is disabled');
});

test('reports unexpected status-command failures instead of polling through them', async ({ expect }) => {
	const sprite = new SpritesClient('test-token').sprite('my-dev');
	vi.spyOn(sprite, 'execFile').mockRejectedValue(
		new ExecError('permission denied', { exitCode: 1, stdout: '', stderr: 'permission denied' }),
	);
	await expect(waitForRex(sprite)).rejects.toThrow('permission denied');
});

test('times out without treating a pending HTTPS listener as ready', async ({ expect }) => {
	const sprite = new SpritesClient('test-token').sprite('my-dev');
	vi.spyOn(sprite, 'execFile').mockResolvedValue({
		stdout: JSON.stringify({ tailscale: { state: 'running', https: { state: 'pending' } } }),
		stderr: '',
		exitCode: 0,
	});
	await expect(waitForRex(sprite, { intervalMs: 0, timeoutMs: 10 })).rejects.toMatchObject({
		code: 'REX_HTTPS_TIMEOUT',
		fix: expect.stringContaining('--resume --rex'),
	});
});

test('creates a supervised personal server with persistent Tailscale state and no anonymous listener', async ({
	expect,
}) => {
	const sprite = new SpritesClient('test-token').sprite('my-dev');
	const list = vi.spyOn(sprite, 'listServices').mockResolvedValue([]);
	vi.spyOn(sprite, 'execFile').mockResolvedValue(readyResult);
	const create = vi
		.spyOn(sprite, 'createService')
		.mockImplementation(async () => new ServiceLogStream(new Response('{"type":"started"}\n')));
	await expect(configureRex(sprite, '/home/sprite')).resolves.toBe(url);
	expect(create).toHaveBeenCalledWith(
		'rex',
		expect.objectContaining({
			cmd: '/usr/bin/rex',
			env: expect.objectContaining({ HOME: '/home/sprite' }),
			args: expect.arrayContaining(['--tailscale', '/home/sprite/.local/state/rex', 'jonah-sprite-my-dev']),
		}),
		'1s',
	);
	const config = create.mock.calls[0]![1];
	expect(config.args).not.toContain('--allow-anonymous');
	// Reusing the same service must preserve its sessions and Tailscale identity.
	list.mockResolvedValue([{ name: 'rex', needs: [], args: [], ...config, state: { name: 'rex', status: 'running' } }]);
	await expect(configureRex(sprite, '/home/sprite')).resolves.toBe(url);
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
