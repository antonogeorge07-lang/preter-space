# PRETER — Mandatory Security and Release Gates

## Mission
One conversation. Every language.
Business without barriers.

## B2B Demo Deadline
Target: 24 October 2026

This date is a delivery target, not proof of
security compliance or production readiness.

## M0 — Authentication and Security
Status: MUST PASS BEFORE RELEASE

- [ ] Secure login and Google OAuth verified
- [ ] MFA or equivalent strong authentication for admins
- [ ] Server-side authentication enforced
- [ ] Convex authorization enforced
- [ ] Organization and conversation access isolated
- [ ] Secure logout verified
- [ ] Session expiration and revocation tested
- [ ] Refresh-token protection tested
- [ ] Employee access removal tested
- [ ] Cross-tenant access denied
- [ ] Authentication regression tests passed

## M1 — Organization Workspace
- [ ] Organization creation
- [ ] Member invitation
- [ ] Membership validation
- [ ] Admin permissions

## M2 — Multilingual Messaging
- [ ] Two authenticated users
- [ ] Real-time messaging
- [ ] Original and translated messages
- [ ] Language selection
- [ ] Conversation access enforcement

## M3 — Production Release
- [ ] Production build passes
- [ ] Lint passes
- [ ] Security tests pass
- [ ] GitHub main synchronized
- [ ] Lovable synchronization verified
- [ ] Deployment confirmed
- [ ] Production smoke tests passed
- [ ] Rollback reference retained

## Canonical Development Workflow

Development branch
  -> Tests and review
  -> GitHub main
  -> Lovable synchronization
  -> Verified production deployment

No force pushes or published-history rewrites.

GitHub synchronization alone does not confirm
that the application has been published.

## Current Quality Baseline

The local production build passed.
Prettier violations were reduced to zero.
39 other lint findings remained.

The formatting changes were not yet committed
at the most recent verified checkpoint.
