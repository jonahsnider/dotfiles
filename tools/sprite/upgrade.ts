import { intro, log, note, outro } from '@clack/prompts';
import type { ServiceWithState } from '@fly/sprites';
import spawn from 'nano-spawn';
import { task } from './output.ts';

async function remote(name: string, args: string[], output?: (message: string) => void) {
	const command = spawn('sprite', ['exec', '-s', name, '--no-stdin', '--no-port-forward', '--', ...args]);
	if (output) {
		for await (const line of command) output(`${line}\n`);
	}
	return (await command).stdout;
}

export async function upgrade(name: string, execute = remote) {
	await task('Updating dotfiles…', (output) =>
		execute(
			name,
			[
				'fish',
				'-lc',
				`cd; or exit $status
chezmoi update --no-tty --error-on-conflict; or begin
    set -l result $status
    chezmoi status --no-tty
    exit $result
end`,
			],
			output,
		),
	);
	await task('Updating configured packages and mise tools…', (output) =>
		execute(
			name,
			['fish', '-lc', 'cd; and mise bootstrap --yes --update --only packages; and mise upgrade --yes'],
			output,
		),
	);
	const rexVersion = await task('Upgrading Rex…', async (output) => {
		await execute(
			name,
			['fish', '-lc', 'sudo -n apt-get update; and sudo -n apt-get install --yes --only-upgrade rex'],
			output,
		);
		return (await execute(name, ['/usr/bin/rex', 'version'])).split('\n')[0];
	});
	const services = JSON.parse(await execute(name, ['sprite-env', 'services', 'list'])) as ServiceWithState[];
	const runningRex = services.filter(
		(service) =>
			service.cmd === '/usr/bin/rex' &&
			service.args?.[0] === 'server' &&
			service.args[1] === 'run' &&
			service.state?.status === 'running',
	);
	if (runningRex.length > 0) {
		await task('Restarting running Rex services…', async (output) => {
			for (const service of runningRex) {
				// oxlint-disable-next-line no-await-in-loop -- Restart services one at a time and stop if a restart fails.
				await execute(name, ['sprite-env', 'services', 'restart', service.name], output);
			}
		});
	}
	return { rexVersion, restartedServices: runningRex.map((service) => service.name) };
}

export async function runUpgrade(name: string) {
	intro(`Upgrade Sprite ${name}`);
	log.warn('Running Rex services will restart, ending their terminal sessions and programs.');
	const { rexVersion, restartedServices } = await upgrade(name);
	note(
		`${rexVersion}\n${restartedServices.length > 0 ? `Restarted: ${restartedServices.join(', ')}` : 'No running Rex services to restart.'}`,
		'Rex',
	);
	outro('Sprite upgrade complete.');
}
