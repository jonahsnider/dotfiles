import { spawnSync } from 'node:child_process';
import tab from '@bomb.sh/tab/cac';
import type { Complete } from '@bomb.sh/tab';
import { log, outro } from '@clack/prompts';
import { cac } from 'cac';
import { Diagnostic } from 'nostics';
import oscStatus from 'osc-status';
import { create, type CreateOptions } from './create.ts';
import { diagnostics, formatException } from './diagnostics.ts';
import { runUpgrade } from './upgrade.ts';
import { runWake } from './wake.ts';

type Options = ({ command: 'create' } & CreateOptions) | { command: 'upgrade' | 'wake'; name: string };

function validateName(name: string) {
	if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(name)) throw diagnostics.SPRITE_INVALID_NAME();
}

function completeSprites(complete: Complete) {
	const result = spawnSync('sprite', ['list'], {
		encoding: 'utf8',
		timeout: 5000,
		stdio: ['ignore', 'pipe', 'ignore'],
	});
	if (result.status === 0) {
		for (const name of result.stdout.trim().split('\n').filter(Boolean)) complete(name, 'Sprite');
	}
}

export async function parseOptions(args: string[]) {
	let result: Options | undefined;
	const cli = cac('sprite_dev');
	cli.help();
	cli
		.command('create [name]', 'Create a dev Sprite with dotfiles and tools (default: dev)')
		.option('--ref <branch-or-tag>', 'Dotfiles revision', { default: 'main' })
		.option('--resume', 'Resume setup of an existing Sprite', { default: false })
		.option('--rex', 'Enable the Rex Tailscale server and save a Rex CLI host on your Mac', { default: false })
		.action((name = 'dev', values: Record<string, unknown>) => {
			validateName(name);
			const value = values['ref'];
			if (typeof value !== 'string' && typeof value !== 'number') throw diagnostics.SPRITE_INVALID_REF();
			const ref = String(value);
			if (!ref || ref.startsWith('-')) throw diagnostics.SPRITE_INVALID_REF();
			result = { command: 'create', name, ref, resume: Boolean(values['resume']), rex: Boolean(values['rex']) };
		});
	cli
		.command('upgrade [name]', 'Update dotfiles, tools, and Rex; restarting Rex ends its sessions (default: dev)')
		.action((name = 'dev') => {
			validateName(name);
			result = { command: 'upgrade', name };
		});
	cli.command('wake [name]', 'Wake a Sprite so you can connect through Rex (default: dev)').action((name = 'dev') => {
		validateName(name);
		result = { command: 'wake', name };
	});
	await tab(cli, {
		subCommands: {
			// Tab's CAC adapter exposes optional [name] arguments as arg0.
			create: {
				args: {
					arg0: (complete) => {
						if (cli.options['resume']) completeSprites(complete);
					},
				},
			},
			upgrade: { args: { arg0: completeSprites } },
			wake: { args: { arg0: completeSprites } },
		},
	});
	try {
		cli.parse(['node', 'sprite_dev', ...args], { run: false });
		if (cli.options['help']) return undefined;
		if (!cli.matchedCommand) {
			if (args.length > 0) throw new Error('Choose create, upgrade, wake, or complete.');
			cli.outputHelp();
			return undefined;
		}
		if (cli.matchedCommandName !== 'complete') {
			cli.args = [...cli.args, ...(cli.options['--'] as string[])];
			cli.options['--'] = [];
		}
		await cli.runMatchedCommand();
	} catch (error) {
		if (error instanceof Diagnostic) throw error;
		throw diagnostics.SPRITE_INVALID_OPTIONS({ message: error instanceof Error ? error.message : String(error) });
	}
	return result;
}

if (import.meta.main) {
	let options: Options | undefined;
	try {
		options = await parseOptions(process.argv.slice(2));
		if (options) {
			if (process.stdout.isTTY) process.stdout.write('\u001b]2;sprite_dev\u0007');
			if (options.command === 'create') await create(options);
			else if (options.command === 'upgrade') await runUpgrade(options.name);
			else await runWake(options.name);
			oscStatus.done({ app: 'dotfiles-sprite', message: 'Sprite operation complete.' });
		}
	} catch (error) {
		if (options) {
			oscStatus.error({ app: 'dotfiles-sprite', message: 'Sprite operation failed.' });
			log.error(formatException(error));
			outro('Sprite operation failed. Fix the error and rerun the same command to retry.');
		} else {
			console.error(formatException(error));
		}
		process.exitCode = 1;
	}
}
