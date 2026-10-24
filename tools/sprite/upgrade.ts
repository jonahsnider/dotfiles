import { intro, log, note, outro } from '@clack/prompts';
import type { ServiceWithState } from '@fly/sprites';
import { cac } from 'cac';
import spawn from 'nano-spawn';
import oscStatus from 'osc-status';
import { diagnostics, formatException } from './diagnostics.ts';
import { task } from './output.ts';

export function parseUpgradeOptions(args: string[]) {
	const cli = cac('sprite_upgrade')
		.usage('<name>')
		.help((sections) => {
			sections.push({
				body: 'Updates dotfiles, configured packages, mise tools, and Rex. Restarts running Rex services, ending their sessions.',
			});
		});
	const { options, args: names } = cli.parse(['node', 'sprite_upgrade', ...args]);
	if (options['help']) return undefined;
	try {
		cli.globalCommand.checkUnknownOptions();
		cli.globalCommand.checkOptionValue();
	} catch (error) {
		throw diagnostics.SPRITE_UPGRADE_FAILED({ message: error instanceof Error ? error.message : String(error) });
	}
	const [name] = [...names, ...(options['--'] as string[])];
	if (
		names.length + (options['--'] as string[]).length !== 1 ||
		!name ||
		!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(name)
	)
		throw diagnostics.SPRITE_INVALID_NAME();
	return name;
}

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

if (import.meta.main) {
	if (process.stdout.isTTY) process.stdout.write('\u001b]2;sprite_upgrade\u0007');
	let name: string | undefined;
	try {
		name = parseUpgradeOptions(process.argv.slice(2));
		if (name) {
			intro(`Upgrade Sprite ${name}`);
			log.warn('Running Rex services will restart, ending their terminal sessions and programs.');
			const { rexVersion, restartedServices } = await upgrade(name);
			note(
				`${rexVersion}\n${restartedServices.length > 0 ? `Restarted: ${restartedServices.join(', ')}` : 'No running Rex services to restart.'}`,
				'Rex',
			);
			outro('Sprite upgrade complete.');
			oscStatus.done({ app: 'dotfiles-sprite', message: 'Sprite upgrade complete.' });
		}
	} catch (error) {
		oscStatus.error({ app: 'dotfiles-sprite', message: 'Sprite upgrade failed.' });
		if (name) {
			log.error(formatException(error));
			outro('Sprite upgrade failed. Fix the error and rerun the same command to retry.');
		} else {
			console.error(formatException(error));
		}
		process.exitCode = 1;
	}
}
