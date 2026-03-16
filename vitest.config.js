import { defineConfig } from 'vitest/config';

export default defineConfig({
    resolve: {
        alias: [
            // ?v=xxx 付きパスを解決: loader.js?v=7 → loader.js
            {
                find: /^(\.\.?\/.+)\?v=\d+$/,
                replacement: '$1'
            }
        ]
    },
    test: {
        include: ['tests/**/*.test.js']
    }
});
