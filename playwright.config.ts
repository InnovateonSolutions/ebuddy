import { defineConfig, devices } from '@playwright/test'

const PORT = 3001

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'on-first-retry',
  },
  webServer: {
    command: `npm run dev -- --hostname 127.0.0.1 --port ${PORT}`,
    url: `http://127.0.0.1:${PORT}/login`,
    reuseExistingServer: true,
    env: {
      NEXT_PUBLIC_APP_URL: `http://127.0.0.1:${PORT}`,
      NEXT_PUBLIC_GOOGLE_AUTH_ENABLED: 'true',
      NEXT_PUBLIC_EMAIL_AUTH_ENABLED: 'false',
      AUTH_SECRET: 'test-dummy-secret-32-chars-minimum',
      DATABASE_URL: 'postgresql://ebuddy:ebuddy@127.0.0.1:5432/ebuddy',
      OPENAI_API_KEY: 'test-openai-api-key',
      ANTHROPIC_API_KEY: 'test-anthropic-api-key',
      GOOGLE_CLIENT_ID: 'test-google-client-id',
      GOOGLE_CLIENT_SECRET: 'test-google-client-secret',
      GOOGLE_REDIRECT_URI: `http://127.0.0.1:${PORT}/api/auth/calendar/google/callback`,
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
