import { defineConfig } from 'orval';

export default defineConfig({
  overclock: {
    input: './openapi/overclock.json',
    output: {
      mode: 'tags-split',
      target: './src/shared/api/generated/endpoints',
      client: 'react-query',
      override: {
        mutator: {
          path: './src/shared/api/http-client.ts',
          name: 'httpClient',
        },
      },
    },
  },
  overclockZod: {
    input: './openapi/overclock.json',
    output: {
      mode: 'tags-split',
      target: './src/shared/api/generated/zod',
      client: 'zod',
    },
  },
});
