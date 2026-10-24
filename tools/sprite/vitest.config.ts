import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		clearMocks: false,
		isolate: false,
		sequence: {
			concurrent: true,
		},
	},
});
