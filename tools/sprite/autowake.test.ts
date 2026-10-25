import { test, vi } from 'vitest';
import { autoWake } from './autowake.ts';

const app = {
	info: { kind: 'app', platform: 'macos' },
	principal: { kind: 'peer' },
	connection_state: 'connected',
};

test('wakes a Sprite from the local app connection without needing a remote connection or selecting tabs', async ({
	expect,
}) => {
	const execute = vi.fn(async () => JSON.stringify({ clients: [app] }));
	const hold = vi.fn(async () => {});
	await autoWake('dev', execute, hold);
	expect(execute).toHaveBeenCalledExactlyOnceWith(['client', 'ls', '--json']);
	expect(hold).toHaveBeenCalledExactlyOnceWith('dev');
});

test.for([
	[],
	[{ ...app, connection_state: 'lost' }],
	[{ ...app, info: { kind: 'cli', platform: 'macos' } }],
	[{ ...app, info: { kind: 'app', platform: 'ios' }, principal: { kind: 'tailscale' } }],
])('does not wake the Sprite without a connected local Mac app: %j', async (clients, { expect }) => {
	const hold = vi.fn(async () => {});
	await autoWake('dev', async () => JSON.stringify({ clients }), hold);
	expect(hold).not.toHaveBeenCalled();
});

test('does not wake the Sprite when the local Rex server is stopped', async ({ expect }) => {
	const hold = vi.fn(async () => {});
	await autoWake(
		'dev',
		async () => {
			throw new Error('rex server is not running');
		},
		hold,
	);
	expect(hold).not.toHaveBeenCalled();
});

test('reports connection and hold failures instead of pretending the Sprite is awake', async ({ expect }) => {
	await expect(
		autoWake('dev', async () => {
			throw new Error('permission denied');
		}),
	).rejects.toThrow('permission denied');
	await expect(
		autoWake(
			'dev',
			async () => JSON.stringify({ clients: [app] }),
			async () => {
				throw new Error('Sprite authentication failed');
			},
		),
	).rejects.toThrow('Sprite authentication failed');
});
