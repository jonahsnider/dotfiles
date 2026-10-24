import { test, vi } from 'vitest';
import { wake } from './wake.ts';

const app = {
	client_id: 'client:mac',
	info: { kind: 'app' },
	connection_state: 'connected',
	session_ids: ['session:active'],
};
const active = { session_id: 'session:active', label: 'work' };

function fixture(sessions: (typeof active)[] | null = [active]) {
	return vi.fn(async (_name: string, args: string[]) => {
		if (args[0] === 'client') return JSON.stringify({ clients: [app] });
		if (args[0] === 'ls') return JSON.stringify({ sessions });
		if (args[0] === 'new') return JSON.stringify({ session_id: 'session:new' });
		return 'null';
	});
}

test('reuses an attached session and switches the app without creating another session', async ({ expect }) => {
	const execute = fixture([{ session_id: 'session:other', label: 'other' }, active]);
	await expect(wake('dev', execute)).resolves.toEqual(active);
	expect(execute.mock.calls.some(([, args]) => args[0] === 'new')).toBe(false);
	expect(execute).toHaveBeenLastCalledWith('dev', [
		'-C',
		'client:mac',
		'do',
		'session.select',
		'session_id=session:active',
	]);
});

test('selects the first existing session when the app has none attached', async ({ expect }) => {
	const first = { session_id: 'session:first', label: 'first' };
	await expect(wake('other-dev', fixture([first]))).resolves.toEqual(first);
});

test.for([null, []])('creates and shows a session when the Sprite has none: %j', async (sessions, { expect }) => {
	const execute = fixture(sessions);
	await expect(wake('other-dev', execute)).resolves.toEqual({ session_id: 'session:new', label: 'other-dev' });
	expect(execute).toHaveBeenCalledWith('other-dev', ['new', 'other-dev', '--json']);
	expect(execute).toHaveBeenLastCalledWith('other-dev', [
		'-C',
		'client:mac',
		'do',
		'session.select',
		'session_id=session:new',
	]);
});

test('waits for the server and app to reconnect before creating or selecting a session', async ({ expect }) => {
	const execute = fixture();
	execute
		.mockRejectedValueOnce(new Error('rex server is not running'))
		.mockResolvedValueOnce(JSON.stringify({ clients: [{ ...app, connection_state: 'reconnecting' }] }));
	await expect(wake('dev', execute, { intervalMs: 0 })).resolves.toEqual(active);
	expect(execute.mock.calls.slice(0, 3).every(([, args]) => args[0] === 'client')).toBe(true);
});

test('reports a missing app without creating a session', async ({ expect }) => {
	const execute = fixture();
	execute.mockResolvedValue(JSON.stringify({ clients: [] }));
	await expect(wake('dev', execute, { intervalMs: 0, timeoutMs: 10 })).rejects.toMatchObject({
		code: 'REX_APP_NOT_CONNECTED',
	});
	expect(execute.mock.calls.every(([, args]) => args[0] === 'client')).toBe(true);
});

test('does not switch an arbitrary app when multiple apps are connected', async ({ expect }) => {
	const execute = fixture();
	execute.mockResolvedValue(JSON.stringify({ clients: [app, { ...app, client_id: 'client:other' }] }));
	await expect(wake('dev', execute, { intervalMs: 0, timeoutMs: 10 })).rejects.toMatchObject({
		code: 'REX_MULTIPLE_APPS',
	});
	expect(execute.mock.calls.every(([, args]) => args[0] === 'client')).toBe(true);
});

test('waits out a stale app connection left over from sleep', async ({ expect }) => {
	const execute = fixture();
	execute.mockResolvedValueOnce(JSON.stringify({ clients: [app, { ...app, client_id: 'client:stale' }] }));
	await expect(wake('dev', execute, { intervalMs: 0 })).resolves.toEqual(active);
	expect(execute.mock.calls.filter(([, args]) => args[0] === 'client')).toHaveLength(2);
});

test('reports authentication errors immediately', async ({ expect }) => {
	const execute = fixture();
	execute.mockRejectedValue(new Error('Sprite authentication failed'));
	await expect(wake('dev', execute)).rejects.toThrow('Sprite authentication failed');
	expect(execute).toHaveBeenCalledOnce();
});

test('reports a refused app action without recreating the session', async ({ expect }) => {
	const execute = fixture();
	execute
		.mockResolvedValueOnce(JSON.stringify({ clients: [app] }))
		.mockResolvedValueOnce(JSON.stringify({ sessions: [active] }));
	execute.mockRejectedValue(new Error('Remote Control is disabled'));
	await expect(wake('dev', execute)).rejects.toThrow('Remote Control is disabled');
	expect(execute.mock.calls.some(([, args]) => args[0] === 'new')).toBe(false);
});
