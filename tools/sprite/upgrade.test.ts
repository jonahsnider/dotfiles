import { test, vi } from 'vitest';
import { upgrade } from './upgrade.ts';

function fixture() {
	const services = [
		{ name: 'rex', cmd: '/usr/bin/rex', args: ['server', 'run'], state: { status: 'running' } },
		{ name: 'rex-proxy-test', cmd: '/usr/bin/rex', args: ['server', 'run'], state: { status: 'running' } },
		{ name: 'rex-stopped', cmd: '/usr/bin/rex', args: ['server', 'run'], state: { status: 'stopped' } },
		{ name: 'app', cmd: '/usr/bin/node', args: ['app.js'], state: { status: 'running' } },
	];
	const execute = vi.fn(async (_name: string, args: string[], _output?: (message: string) => void) => {
		if (args[0] === 'sprite-env' && args[2] === 'list') return JSON.stringify(services);
		if (args[0] === '/usr/bin/rex') return 'rex test-version\ncommit: test';
		return '';
	});
	return { execute, services };
}

test('restarts only running Rex servers after upgrading and reports the installed version', async ({ expect }) => {
	const { execute } = fixture();
	await expect(upgrade('dev3', execute)).resolves.toEqual({
		rexVersion: 'rex test-version',
		restartedServices: ['rex', 'rex-proxy-test'],
	});
	const restarts = execute.mock.calls.filter(([, args]) => args[2] === 'restart');
	expect(restarts.map(([, args]) => args[3])).toEqual(['rex', 'rex-proxy-test']);
	expect(execute.mock.calls.every(([name]) => name === 'dev3')).toBe(true);
});

test('leaves all services alone when no Rex server is running', async ({ expect }) => {
	const { execute, services } = fixture();
	services.splice(0, 2);
	await expect(upgrade('dev3', execute)).resolves.toMatchObject({ restartedServices: [] });
	expect(execute.mock.calls.some(([, args]) => args[2] === 'restart')).toBe(false);
});

test.for([0, 1, 2])('stops after failed update stage %s without restarting services', async (stage, { expect }) => {
	const { execute } = fixture();
	for (let index = 0; index < stage; index++) execute.mockResolvedValueOnce('');
	execute.mockRejectedValueOnce(new Error('update failed'));
	await expect(upgrade('dev3', execute)).rejects.toThrow('update failed');
	expect(execute).toHaveBeenCalledTimes(stage + 1);
	expect(execute.mock.calls.some(([, args]) => args[2] === 'restart')).toBe(false);
});

test('stops restarting services after a restart fails', async ({ expect }) => {
	const { execute } = fixture();
	execute.mockImplementation(async (_name, args) => {
		if (args[2] === 'list')
			return JSON.stringify([
				{ name: 'rex', cmd: '/usr/bin/rex', args: ['server', 'run'], state: { status: 'running' } },
				{ name: 'rex-proxy-test', cmd: '/usr/bin/rex', args: ['server', 'run'], state: { status: 'running' } },
			]);
		if (args[2] === 'restart') throw new Error('restart failed');
		return '';
	});
	await expect(upgrade('dev3', execute)).rejects.toThrow('restart failed');
	expect(execute.mock.calls.filter(([, args]) => args[2] === 'restart')).toHaveLength(1);
});
