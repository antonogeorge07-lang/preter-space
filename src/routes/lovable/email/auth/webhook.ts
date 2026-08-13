import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute("/lovable/email/auth/webhook")({
  server: {
    handlers: {
      // Loaded inside the handler so React Email never enters the client bundle.
      POST: async ({ request }) => {
        const { getAuthEmailHandler } = await import('@/lib/email-templates/auth-handler.server')
        return getAuthEmailHandler()(request)
      },
    },
  },
})
