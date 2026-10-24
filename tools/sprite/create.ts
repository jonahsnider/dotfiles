import { readFile } from 'node:fs/promises';
import { createClient, DesktopAuth } from '@1password/sdk';
import { intro, log, note, outro } from '@clack/prompts';
import { SpritesClient, type Sprite } from '@fly/sprites';
import { cac } from 'cac';
import oscStatus from 'osc-status';
import { diagnostics, formatException } from './diagnostics.ts';
import { task } from './output.ts';
import { configureRex, registerRexHost } from './rex.ts';

const personalAccountID = 'JZNG2TXEHBHA7M2BS2TJATCIAA';
const serviceAccountReference = 'op://Personal/x7wy664xb4ysha6gyzjdz5o454/credential';
const spritesTokenReference = 'op://Personal/Sprites API key/credential';

export function parseOptions(args: string[]) {
	const cli = cac('sprite_create')
		.usage('<name> [options]')
		.option('--ref <branch-or-tag>', 'Dotfiles revision', { default: 'main' })
		.option('--resume', 'Resume setup of an existing Sprite', { default: false })
		.option('--rex', 'Enable the Rex Tailscale server and save a Rex CLI host on your Mac', { default: false })
		.help((sections) => {
			sections.push({
				body: 'Enable 1Password SDK desktop integration. Both tokens are read from your personal vault. Rex is always installed.',
			});
		});
	const { options: values, args: parsedArgs } = cli.parse(['node', 'sprite_create', ...args]);
	if (values['help']) return undefined;
	try {
		cli.globalCommand.checkUnknownOptions();
		cli.globalCommand.checkOptionValue();
	} catch (cause) {
		throw diagnostics.SPRITE_INVALID_OPTIONS({
			message: cause instanceof Error ? cause.message : String(cause),
			cause,
		});
	}
	const positionals = [...parsedArgs, ...(values['--'] as string[])];
	const [name] = positionals;
	if (positionals.length !== 1 || !name || !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(name)) {
		throw diagnostics.SPRITE_INVALID_NAME();
	}
	const refValue: unknown = values['ref'];
	if (typeof refValue !== 'string' && typeof refValue !== 'number') throw diagnostics.SPRITE_INVALID_REF();
	const ref = String(refValue);
	if (!ref || ref.startsWith('-')) throw diagnostics.SPRITE_INVALID_REF();
	return {
		name,
		ref,
		resume: Boolean(values['resume']),
		rex: Boolean(values['rex']),
	};
}

async function run(sprite: Sprite, command: string, args: string[], cwd: string, output: (message: string) => void) {
	const child = sprite.spawn(command, args, { cwd });
	child.once('spawn', () => child.stdin.end());
	child.stdout.setEncoding('utf8').on('data', output);
	child.stderr.setEncoding('utf8').on('data', output);
	try {
		const code = await Promise.race([
			child.wait(),
			new Promise<never>((_resolve, reject) => child.once('error', reject)),
		]);
		if (code !== 0) throw diagnostics.SPRITE_REMOTE_COMMAND_FAILED({ command, code });
	} finally {
		child.stdout.off('data', output);
		child.stderr.off('data', output);
		child.close();
	}
}

export async function provision(
	sprite: Sprite,
	token: string,
	ref: string,
	reportProgress?: (message: string) => void,
) {
	if (!token.trim()) throw diagnostics.SPRITE_EMPTY_TOKEN({ token: 'Sprite service-account' });
	const { home, fs } = await task(
		'Preparing credentials and declarative Linux configuration…',
		async () => {
			await sprite.execFile('bash', [
				'--noprofile',
				'--norc',
				'-ec',
				`
		umask 077
		mkdir -p "$HOME/.config/op" "$HOME/.config/mise/conf.d" "$HOME/.local/share/dotfiles"
		chmod 700 "$HOME/.config/op"
	`,
			]);
			const { stdout } = await sprite.execFile('printenv', ['HOME']);
			const home = stdout.toString().trim();
			if (!home.startsWith('/')) throw diagnostics.SPRITE_INVALID_HOME();
			const fs = sprite.filesystem(home);
			await fs.writeFile('.config/op/service-account-token', token, { mode: 0o600 });
			await fs.chmod('.config/op/service-account-token', 0o600);
			await fs.writeFile(
				'.config/mise/conf.d/linux.toml',
				await readFile(new URL('../../private_dot_config/mise/conf.d/linux.toml', import.meta.url)),
			);
			await fs.writeFile(
				'.local/share/dotfiles/mise.toml',
				`[bootstrap.repos]\n"~/programming/dotfiles" = { url = "https://github.com/jonahsnider/dotfiles.git", ref = ${JSON.stringify(ref)} }\n`,
			);
			return { home, fs };
		},
		reportProgress,
	);

	const mise = `${home}/.local/bin/mise`;
	const bootstrapDir = `${home}/.local/share/dotfiles`;
	await task(
		'Installing mise…',
		async (output) => {
			await run(
				sprite,
				'bash',
				['--noprofile', '--norc', '-ec', 'set -o pipefail; curl -fsSL https://mise.run | sh'],
				home,
				output,
			);
			await run(sprite, mise, ['trust', `${bootstrapDir}/mise.toml`], home, output);
		},
		reportProgress,
	);
	await task(
		'Reconciling Ubuntu packages and the dotfiles checkout…',
		(output) => run(sprite, mise, ['bootstrap', '--yes', '--update', '--only', 'packages,repos'], bootstrapDir, output),
		reportProgress,
	);
	// On resume, fish loads any already-rendered credentials before shared tools are installed.
	await task(
		'Installing managed tools…',
		(output) => run(sprite, 'fish', ['-c', '$argv[1] bootstrap --yes --only tools', mise], bootstrapDir, output),
		reportProgress,
	);
	await task(
		'Applying dotfiles and installing tools and plugins…',
		async (output) => {
			await fs.writeFile(
				'.config/chezmoi/chezmoi.toml',
				`sourceDir = ${JSON.stringify(`${home}/programming/dotfiles`)}\n`,
			);
			// Capture the bootstrap tool PATH before the first apply installs the shared mise config.
			// The inner fish then loads the rendered credentials before Chezmoi's install scripts run.
			await run(
				sprite,
				mise,
				[
					'exec',
					'--',
					'fish',
					'--no-config',
					'-c',
					`
		vp env setup; or exit $status
		chezmoi apply --force --exclude=scripts; or exit $status
		fish -c 'chezmoi apply --force'; or exit $status
		fish -c 'node --version; and pnpm --version; and rustc --version'; or exit $status
	`,
				],
				bootstrapDir,
				output,
			);
		},
		reportProgress,
	);

	await task(
		'Installing Rex…',
		async (output) => {
			await run(
				sprite,
				'fish',
				[
					'-c',
					'bash -o pipefail -ec $argv[1]',
					`
: "\${REX_PACKAGE_TOKEN:?REX_PACKAGE_TOKEN is missing from the rendered 1Password Environment}"
curl -fsSL -u "rex:$REX_PACKAGE_TOKEN" https://pkgs.superlogical.com/rex/install.sh | sh
`,
				],
				bootstrapDir,
				output,
			);
		},
		reportProgress,
	);
	return home;
}

if (import.meta.main) {
	if (process.stdout.isTTY) process.stdout.write('\u001b]2;sprite_create\u0007');
	let options: ReturnType<typeof parseOptions>;
	let created = false;
	try {
		options = parseOptions(process.argv.slice(2));
		if (options) {
			const { name, ref, resume, rex } = options;
			intro(`Set up Sprite ${name}`);
			const { apiToken, serviceAccountToken } = await task(
				'Authorize access to your personal 1Password vault…',
				async () => {
					oscStatus.blocked({
						app: 'dotfiles-sprite',
						kind: 'auth',
						message: 'Authorize access to your personal 1Password vault.',
					});
					const op = await createClient({
						auth: new DesktopAuth(personalAccountID),
						integrationName: 'Dotfiles Sprite setup',
						integrationVersion: '0.0.0',
					});
					const apiToken = await op.secrets.resolve(spritesTokenReference);
					if (!apiToken?.trim()) throw diagnostics.SPRITE_EMPTY_TOKEN({ token: 'Sprites API' });
					const serviceAccountToken = await op.secrets.resolve(serviceAccountReference);
					if (!serviceAccountToken.trim()) throw diagnostics.SPRITE_EMPTY_TOKEN({ token: 'Sprite service-account' });
					return { apiToken: apiToken.trim(), serviceAccountToken: serviceAccountToken.trim() };
				},
			);
			const client = new SpritesClient(apiToken);
			const sprite = await task(`${resume ? 'Resuming' : 'Creating'} Sprite ${name}…`, () =>
				resume ? client.getSprite(name) : client.createSprite(name, { urlSettings: { auth: 'sprite' } }),
			);
			created = true;
			const home = await provision(sprite, serviceAccountToken, ref);
			if (rex) {
				log.step('Configuring the Rex Tailscale service…');
				oscStatus.working({ app: 'dotfiles-sprite', message: 'Configuring the Rex Tailscale service…' });
				const url = await configureRex(sprite, home);
				try {
					await task('Saving the remote host in the Rex CLI host list on your Mac…', () => registerRexHost(name, url));
				} catch (error) {
					log.warn(formatException(error));
				}
				note(
					`Name: ${name}\nURL: ${url}\n\nIn Rex on your Mac, choose Add Remote Host…\nand enter the name and URL above.\nThe CLI host list does not sync to the app.`,
					'Rex remote host',
				);
			}
			note(`sprite exec -s ${name} --tty -- fish -l\n\nSign in to Claude/Codex inside the Sprite.`, 'Connect');
			outro('Sprite setup complete.');
			oscStatus.done({ app: 'dotfiles-sprite', message: 'Sprite setup complete.' });
		}
	} catch (error) {
		oscStatus.error({ app: 'dotfiles-sprite', message: 'Sprite setup failed.' });
		if (options) {
			log.error(formatException(error));
			if (created) log.info(`Sprite ${options.name} was kept. Rerun the same command with --resume to retry setup.`);
			outro('Sprite setup failed.');
		} else {
			console.error(formatException(error));
		}
		process.exitCode = 1;
	}
}
