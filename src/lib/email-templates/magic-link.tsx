import * as React from 'react'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from '@react-email/components'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({
  siteName,
  confirmationUrl,
}: MagicLinkEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your login link for {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Your login link</Heading>
        <Text style={text}>
          Click the button below to log in to {siteName}. This link will expire
          shortly.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Log In
        </Button>
        <Text style={footer}>
          If you didn't request this link, you can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail

const main = { backgroundColor: '#f5f6fa', fontFamily: "'Plus Jakarta Sans', 'Helvetica Neue', Arial, sans-serif", padding: '32px 0', margin: 0 }
const container = { backgroundColor: '#ffffff', borderRadius: '20px', border: '1px solid #e5e7eb', padding: '36px 32px', maxWidth: '480px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 700 as const, color: '#111827', letterSpacing: '-0.01em', margin: '0 0 18px' }
const text = { fontSize: '15px', color: '#4b5563', lineHeight: '1.6', margin: '0 0 22px' }
const button = { backgroundColor: '#4f46e5', color: '#ffffff', fontSize: '15px', fontWeight: 600 as const, borderRadius: '12px', padding: '14px 24px', textDecoration: 'none', display: 'inline-block' }
const footer = { fontSize: '12px', color: '#9ca3af', lineHeight: '1.6', margin: '28px 0 0' }
