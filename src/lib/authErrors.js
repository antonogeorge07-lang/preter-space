/**
 * Turns raw auth/network failures into wording a person can act on.
 * Returns { message, retryable } so screens can offer a "Try again" button
 * instead of surfacing "Failed to fetch".
 */
export function authErrorMessage(err) {
  const raw = (err?.message || '').toLowerCase();

  const networkish =
    raw.includes('failed to fetch') ||
    raw.includes('networkerror') ||
    raw.includes('network request failed') ||
    raw.includes('load failed') ||
    raw.includes('fetch failed') ||
    raw.includes('timed out') ||
    raw.includes('timeout');

  if (networkish) {
    return {
      message: "We couldn't reach Preter. Check your connection and try again.",
      retryable: true,
    };
  }

  if (raw.includes('rate limit') || raw.includes('too many')) {
    return { message: 'Too many attempts. Please wait a moment and try again.', retryable: true };
  }

  if (raw.includes('confirm') && raw.includes('email')) {
    return { message: 'Please confirm your email first, then sign in.', retryable: false };
  }

  if (raw.includes('password') || raw.includes('invalid') || raw.includes('credential')) {
    return { message: 'Incorrect email or password.', retryable: false };
  }

  return { message: 'Sign in failed. Please try again.', retryable: true };
}

export default authErrorMessage;
