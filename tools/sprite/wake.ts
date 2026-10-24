import { intro, outro } from '@clack/prompts';
import spawn from 'nano-spawn';
import { task } from './output.ts';

export async function runWake(name: string) {
	intro(`Wake Sprite ${name}`);
	await task('Waking the Sprite…', async () => {
		await spawn('sprite', ['exec', '-s', name, '--no-stdin', '--no-port-forward', '--', 'true']);
	});
	outro(`Sprite ${name} is awake. Connect through Rex now.`);
}
