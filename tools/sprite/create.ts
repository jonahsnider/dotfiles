import { readFile } from 'node:fs/promises';
import { createClient, DesktopAuth } from '@1password/sdk';
import { SpritesClient, type Sprite } from '@fly/sprites';
import { cac } from 'cac';
import oscStatus from 'osc-status';
import { diagnostics, formatException } from './diagnostics.ts';
import { configureRex, registerRexHost } from './rex.ts';

const personalAccountID = 'JZNG2TXEHBHA7M2BS2TJATCIAA';
const serviceAccountReference = 'op://Personal/x7wy664xb4ysha6gyzjdz5o454/credential';
const spritesTokenReference = 'op://Personal/Sprites API key/credential';

export function parseOptions(args: string[]) {
	const cli = cac('sprite_create')
		.usage('<name> [options]')
		.option('--ref <branch-or-tag>', 'Dotfiles revision', { default: 'main' })
		.option('--resume', 'Resume setup of an existing Sprite', { default: false })
		.option('--rex', 'Enable the Rex Tailscale server and add the remote host on your Mac', { default: false })
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

function progress(message: string) {
	console.log(message);
	oscStatus.working({ app: 'dotfiles-sprite', message });
}

async function run(sprite: Sprite, command: string, args: string[], cwd: string) {
	const child = sprite.spawn(command, args, { cwd });
	child.once('spawn', () => child.stdin.end());
	child.stdout.pipe(process.stdout, { end: false });
	child.stderr.pipe(process.stderr, { end: false });
	try {
		const code = await Promise.race([
			child.wait(),
			new Promise<never>((_resolve, reject) => child.once('error', reject)),
		]);
		if (code !== 0) throw diagnostics.SPRITE_REMOTE_COMMAND_FAILED({ command, code });
	} finally {
		child.stdout.unpipe(process.stdout);
		child.stderr.unpipe(process.stderr);
		child.close();
	}
}

export async function provision(sprite: Sprite, token: string, ref: string, reportProgress = progress) {
	if (!token.trim()) throw diagnostics.SPRITE_EMPTY_TOKEN({ token: 'Sprite service-account' });
	reportProgress('Preparing credentials and declarative Linux configuration…');
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
	reportProgress('Installing mise…');
	await run(
		sprite,
		'bash',
		['--noprofile', '--norc', '-ec', 'set -o pipefail; curl -fsSL https://mise.run | sh'],
		home,
	);
	const mise = `${home}/.local/bin/mise`;
	const bootstrapDir = `${home}/.local/share/dotfiles`;
	await run(sprite, mise, ['trust', `${bootstrapDir}/mise.toml`], home);
	reportProgress('Reconciling Ubuntu packages and the dotfiles checkout…');
	await run(sprite, mise, ['bootstrap', '--yes', '--update', '--only', 'packages,repos'], bootstrapDir);
	// On resume, fish loads any already-rendered credentials before shared tools are installed.
	reportProgress('Installing managed tools…');
	await run(sprite, 'fish', ['-c', '$argv[1] bootstrap --yes --only tools', mise], bootstrapDir);
	await fs.writeFile('.config/chezmoi/chezmoi.toml', `sourceDir = ${JSON.stringify(`${home}/programming/dotfiles`)}\n`);
	reportProgress('Applying dotfiles and installing tools and plugins…');
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
	);
	reportProgress('Installing Rex…');
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
			const client = new SpritesClient(apiToken.trim());
			progress(`${options.resume ? 'Resuming' : 'Creating'} Sprite ${options.name}…`);
			const sprite = options.resume
				? await client.getSprite(options.name)
				: await client.createSprite(options.name, { urlSettings: { auth: 'sprite' } });
			created = true;
			const home = await provision(sprite, serviceAccountToken.trim(), options.ref);
			if (options.rex) {
				progress('Configuring the Rex Tailscale service…');
				const url = await configureRex(sprite, home);
				console.log(`Rex remote host:\nName: ${options.name}\nURL: ${url}`);
				progress('Registering the remote host in Rex on your Mac…');
				try {
					await registerRexHost(options.name, url);
					console.log('Remote host saved in Rex on your Mac.');
				} catch (error) {
					console.warn(formatException(error));
					console.log(
						'Automatic Rex registration failed. In Rex on your Mac, choose Add Remote Host… and enter the name and URL above.',
					);
				}
			}
			console.log(
				`Ready. Connect with: sprite exec -s ${options.name} --tty -- fish -l\nAgent login is a separate step inside the Sprite.`,
			);
			oscStatus.done({ app: 'dotfiles-sprite', message: 'Sprite setup complete.' });
		}
	} catch (error) {
		oscStatus.error({ app: 'dotfiles-sprite', message: 'Sprite setup failed.' });
		console.error(formatException(error));
		if (created && options)
			console.error(`Sprite ${options.name} was kept. Rerun the same command with --resume to retry setup.`);
		process.exitCode = 1;
	}
}
