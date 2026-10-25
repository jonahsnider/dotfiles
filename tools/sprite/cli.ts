import { spawnSync } from 'node:child_process';
import { script, ShellCompDirective } from '@bomb.sh/tab';
import { log, outro } from '@clack/prompts';
import {
	buildApplication,
	buildChoiceParser,
	buildCommand,
	buildRouteMap,
	proposeCompletions,
	run,
	type ApplicationContext,
} from '@stricli/core';
import oscStatus from 'osc-status';
import { create, type CreateOptions } from './create.ts';
import { diagnostics, formatException } from './diagnostics.ts';
import { runUpgrade } from './upgrade.ts';

function validateName(name: string) {
	if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(name)) throw diagnostics.SPRITE_INVALID_NAME();
}

function completeSprites() {
	const result = spawnSync('sprite', ['list'], {
		encoding: 'utf8',
		timeout: 5000,
		stdio: ['ignore', 'pipe', 'ignore'],
	});
	return result.status === 0 ? result.stdout.trim().split('\n').filter(Boolean) : [];
}

export async function runCli(args: string[]) {
	let operationStarted = false;
	let commandError: unknown;
	let stderr = '';
	const context: ApplicationContext = {
		process: {
			stdout: process.stdout,
			stderr: {
				write: (message) => {
					stderr += message;
				},
			},
		},
	};
	async function runOperation(operation: () => Promise<void>) {
		operationStarted = true;
		if (process.stdout.isTTY) process.stdout.write('\u001b]2;sprite_dev\u0007');
		await operation();
		oscStatus.done({ app: 'dotfiles-sprite', message: 'Sprite operation complete.' });
	}
	const nameParameter = { parse: String, placeholder: 'name', brief: 'Sprite', default: 'dev' };
	const routes = buildRouteMap({
		routes: {
			create: buildCommand({
				async func(flags: Omit<CreateOptions, 'name'>, name: string) {
					validateName(name);
					if (flags.rex && name.length > 50) throw diagnostics.REX_HOSTNAME_TOO_LONG();
					if (!flags.ref || flags.ref.startsWith('-')) throw diagnostics.SPRITE_INVALID_REF();
					await runOperation(() => create({ name, ...flags }));
				},
				parameters: {
					flags: {
						ref: {
							kind: 'parsed',
							parse: String,
							brief: 'Dotfiles revision',
							placeholder: 'branch-or-tag',
							default: 'main',
						},
						resume: { kind: 'boolean', brief: 'Resume setup of an existing Sprite', default: false },
						rex: {
							kind: 'boolean',
							brief: 'Enable the Rex Tailscale server and save a Rex CLI host on your Mac',
							default: false,
						},
					},
					positional: {
						kind: 'tuple',
						parameters: [
							{
								...nameParameter,
								proposeCompletions: () => (args.slice(2, -1).includes('--resume') ? completeSprites() : []),
							},
						],
					},
				},
				docs: { brief: 'Create a dev Sprite with dotfiles and tools' },
			}),
			upgrade: buildCommand({
				async func(_flags: {}, name: string) {
					validateName(name);
					await runOperation(() => runUpgrade(name));
				},
				parameters: {
					positional: { kind: 'tuple', parameters: [{ ...nameParameter, proposeCompletions: completeSprites }] },
				},
				docs: { brief: 'Update dotfiles, tools, and Rex; restarting Rex ends its sessions' },
			}),
			complete: buildCommand({
				func(_flags: {}, shell: string) {
					script(shell, 'sprite_dev', 'sprite_dev');
				},
				parameters: {
					positional: {
						kind: 'tuple',
						parameters: [
							{
								parse: buildChoiceParser(['bash', 'zsh', 'fish', 'powershell']),
								placeholder: 'shell',
								brief: 'Shell type',
							},
						],
					},
				},
				docs: { brief: 'Generate shell completion scripts' },
			}),
		},
		docs: { brief: 'Create and upgrade dev Sprites' },
	});
	const app = buildApplication(routes, {
		name: 'sprite_dev',
		scanner: { allowArgumentEscapeSequence: true },
		determineExitCode(error) {
			commandError = error;
			return 1;
		},
	});
	try {
		if (args[0] === 'complete' && (args[1] === '--' || args.length === 1)) {
			const inputs = args.length === 1 ? [''] : args.slice(2);
			for (const { completion, brief } of await proposeCompletions(app, inputs, context)) {
				console.log(`${completion}\t${brief}`);
			}
			console.log(`:${ShellCompDirective.ShellCompDirectiveNoFileComp}`);
			return 0;
		}
		await run(app, args, context);
		if (commandError !== undefined) throw commandError;
		if (context.process.exitCode) throw diagnostics.SPRITE_INVALID_OPTIONS({ message: stderr.trim() });
		return 0;
	} catch (error) {
		if (operationStarted) {
			oscStatus.error({ app: 'dotfiles-sprite', message: 'Sprite operation failed.' });
			log.error(formatException(error));
			outro('Sprite operation failed. Fix the error and rerun the same command to retry.');
		} else {
			console.error(formatException(error));
		}
		return 1;
	}
}

if (import.meta.main) process.exitCode = await runCli(process.argv.slice(2));
