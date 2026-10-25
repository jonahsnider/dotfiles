import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';
import spawn from 'nano-spawn';
import { test } from 'vitest';

test.for([
	{ holdStatus: 0, commandStatus: 0 },
	{ holdStatus: 0, commandStatus: 7 },
	{ holdStatus: 1, commandStatus: 0 },
])(
	'holds unattended commands, releases on exit, and refuses to start without a hold: %j',
	async ({ holdStatus, commandStatus }, { expect }) => {
		const directory = await mkdtemp(join(tmpdir(), 'sprite-hold-'));
		const log = join(directory, 'calls.log');
		const args = ['--model', 'model with spaces', '--verbose=false', '-h', '--', '-x'];
		try {
			await writeFile(
				join(directory, 'curl'),
				`#!/bin/sh
while [ "$#" -gt 0 ]; do
  if [ "$1" = -X ]; then
    printf '%s\\n' "$2" >> "$SPRITE_HOLD_TEST_LOG"
    if [ "$2" = PUT ]; then exit ${holdStatus}; fi
    exit 0
  fi
  shift
done
exit 2
`,
				{ mode: 0o700 },
			);
			const result = await spawn(
				process.execPath,
				[
					'hold.ts',
					process.execPath,
					'-e',
					`require('node:fs').appendFileSync(process.env.SPRITE_HOLD_TEST_LOG, JSON.stringify(process.argv.slice(1)) + '\\n'); process.exit(${commandStatus});`,
					'--',
					...args,
				],
				{
					cwd: import.meta.dirname,
					env: { PATH: `${directory}${delimiter}${process.env['PATH']}`, SPRITE_HOLD_TEST_LOG: log },
				},
			).then(
				() => 0,
				(error: { exitCode: number }) => error.exitCode,
			);
			expect(result).toBe(holdStatus === 0 ? commandStatus : 1);
			expect(await readFile(log, 'utf8')).toBe(holdStatus === 0 ? `PUT\n${JSON.stringify(args)}\nDELETE\n` : 'PUT\n');
		} finally {
			await rm(directory, { recursive: true, force: true });
		}
	},
);
