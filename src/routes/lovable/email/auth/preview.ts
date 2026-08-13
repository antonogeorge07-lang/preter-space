import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute("/lovable/email/auth/preview")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env['LOVABLE_API_KEY']

        if (!apiKey) {
          return Response.json({ error: 'Server configuration error' }, { status: 500 })
        }

        const authHeader = request.headers.get('Authorization')
        if (!authHeader || authHeader !== `Bearer ${apiKey}`) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 })
        }

        let type: string
        try {
          const body = await request.json()
          type = body.type
        } catch {
          return Response.json({ error: 'Invalid JSON in request body' }, { status: 400 })
        }

        // Loaded inside the handler so React Email never enters the client bundle.
        const { renderAuthEmailPreview } = await import('@/lib/email-templates/auth-preview.server')
        const html = await renderAuthEmailPreview(type)

        if (html === null) {
          return Response.json({ error: `Unknown email type: ${type}` }, { status: 400 })
        }

        return new Response(html, {
          status: 200,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        })
      },
    },
  },
})
