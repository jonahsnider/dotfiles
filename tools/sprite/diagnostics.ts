import { Diagnostic, defineDiagnostics, formatDiagnostic } from 'nostics';

export const diagnostics = defineDiagnostics({
	codes: {
		SPRITE_INVALID_OPTIONS: {
			why: ({ message }: { message: string }) => message,
			fix: 'Run pnpm run create --help for usage.',
		},
		SPRITE_INVALID_NAME: {
			why: 'Provide one Sprite name: 1-63 lowercase letters, digits, or hyphens; start and end with a letter or digit.',
		},
		SPRITE_INVALID_REF: {
			why: '--ref must be a branch or tag.',
		},
		SPRITE_EMPTY_TOKEN: {
			why: ({ token }: { token: string }) => `The ${token} token is empty.`,
			fix: 'Check the token in your personal 1Password vault.',
		},
		SPRITE_REMOTE_COMMAND_FAILED: {
			why: ({ command, code }: { command: string; code: number }) => `Remote ${command} exited with status ${code}.`,
		},
		SPRITE_INVALID_HOME: {
			why: 'Sprite did not return an absolute HOME directory.',
		},
		REX_TAILSCALE_FAILED: {
			why: ({ message }: { message: string }) => `Rex Tailscale: ${message}`,
		},
		REX_HTTPS_TIMEOUT: {
			why: 'Rex HTTPS was not ready within the sign-in timeout.',
			fix: 'Complete Tailscale authorization, then retry with --resume --rex.',
		},
		REX_SERVICE_CONFLICT: {
			why: 'The existing Sprite service named rex has a different configuration.',
		},
		REX_SERVICE_FAILED: {
			why: ({ detail }: { detail: string | number }) => `Rex service failed during startup: ${detail}`,
		},
		REX_CLI_NOT_FOUND: {
			why: 'The local Rex CLI could not be found.',
			fix: 'Install Rex or set REX_BIN_DIR to its CLI directory.',
		},
		REX_HOST_CONFLICT: {
			why: ({ name }: { name: string }) => `A different Rex host already uses the name ${name}.`,
		},
		SPRITE_SETUP_FAILED: {
			why: ({ message }: { message: string }) => message,
		},
	},
});

export function formatException(error: unknown) {
	return formatDiagnostic(
		error instanceof Diagnostic
			? error
			: diagnostics.SPRITE_SETUP_FAILED({
					message: error instanceof Error ? error.message : String(error),
					cause: error,
				}),
	);
}
