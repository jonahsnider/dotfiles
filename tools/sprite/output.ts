import { log, spinner, taskLog } from '@clack/prompts';
import oscStatus from 'osc-status';

export async function task<T>(
	title: string,
	action: (output: (message: string) => void) => Promise<T>,
	reportProgress = (message: string) => {
		oscStatus.working({ app: 'dotfiles-sprite', message });
	},
) {
	reportProgress(title);
	const progress = process.stdout.isTTY ? spinner({ onCancel: () => process.exit(130) }) : undefined;
	let preview: ReturnType<typeof taskLog> | undefined;
	const output: string[] = [];
	if (progress) progress.start(title);
	else log.step(title);
	try {
		const result = await action((message) => {
			if (progress && !preview) {
				progress.clear();
				preview = taskLog({ title, limit: 5, retainLog: true });
			}
			if (preview) preview.message(message, { raw: true });
			else output.push(message);
		});
		if (preview) preview.success(title);
		else progress?.stop(title);
		return result;
	} catch (error) {
		if (preview) preview.error(title);
		else if (progress) progress.error(title);
		else log.error(title);
		if (output.length > 0) log.message(output.join(''));
		throw error;
	}
}
