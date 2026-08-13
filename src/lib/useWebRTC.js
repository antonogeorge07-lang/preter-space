/**
 * useWebRTC — WebRTC hook that uses Convex `calls` documents for signaling.
 * Offer/answer and trickle ICE flow through Convex mutations, and the remote
 * side is watched through a live Convex query subscription (no polling).
 */
import { useRef, useState, useCallback, useEffect } from 'react';
import { convexChat } from '@/lib/convexChat';

// STUN + free public TURN servers for firewall traversal
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
  {
    urls: 'turn:openrelay.metered.ca:80',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:openrelay.metered.ca:443',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:openrelay.metered.ca:443?transport=tcp',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
];

export function useWebRTC({ onRemoteStream, onStateChange }) {
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const callIdRef = useRef(null);
  const roleRef = useRef('caller');
  const unwatchRef = useRef(null);
  const remoteDescSetRef = useRef(false);
  const appliedCandidatesRef = useRef(0);
  const [connState, setConnState] = useState('idle'); // idle|connecting|connected|failed|ended

  const stopWatch = useCallback(() => {
    try { unwatchRef.current?.(); } catch {}
    unwatchRef.current = null;
  }, []);

  const cleanup = useCallback(() => {
    stopWatch();
    if (pcRef.current) {
      pcRef.current.onicecandidate = null;
      pcRef.current.ontrack = null;
      pcRef.current.onconnectionstatechange = null;
      pcRef.current.close();
      pcRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    callIdRef.current = null;
    remoteDescSetRef.current = false;
    appliedCandidatesRef.current = 0;
    setConnState('idle');
  }, [stopWatch]);

  const createPC = useCallback((role, myKey) => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS, iceCandidatePoolSize: 10 });

    pc.ontrack = (e) => { if (onRemoteStream) onRemoteStream(e.streams[0]); };

    pc.onconnectionstatechange = () => {
      const s = pc.connectionState;
      const mapped = s === 'connected' ? 'connected'
        : s === 'disconnected' || s === 'failed' ? 'failed'
        : s === 'closed' ? 'ended'
        : 'connecting';
      setConnState(mapped);
      if (onStateChange) onStateChange(mapped);
    };

    // Trickle ICE — push each candidate straight into Convex
    pc.onicecandidate = (e) => {
      if (!e.candidate || !callIdRef.current) return;
      convexChat
        .addCandidate({ callId: callIdRef.current, from: myKey, candidate: e.candidate.toJSON() })
        .catch(() => {});
    };

    roleRef.current = role;
    pcRef.current = pc;
    return pc;
  }, [onRemoteStream, onStateChange]);

  const applyRemoteCandidates = useCallback(async (candidates = []) => {
    if (!pcRef.current || !remoteDescSetRef.current) return;
    for (const c of candidates) {
      try { await pcRef.current.addIceCandidate(new RTCIceCandidate(c)); } catch {}
    }
  }, []);

  const waitForIce = (pc) =>
    Promise.race([
      new Promise((res) => {
        if (pc.iceGatheringState === 'complete') return res();
        pc.onicegatheringstatechange = () => { if (pc.iceGatheringState === 'complete') res(); };
      }),
      new Promise((res) => setTimeout(res, 3000)),
    ]);

  /** Live-watch the call doc for answer / candidates / hangup. */
  const watchCall = useCallback((callId, role) => {
    stopWatch();
    unwatchRef.current = convexChat.watchCall(callId, async (call) => {
      if (!call) return;

      if (['declined', 'ended', 'missed'].includes(call.status)) {
        stopWatch();
        setConnState('ended');
        if (onStateChange) onStateChange('ended:' + call.status);
        return;
      }

      if (role === 'caller' && call.answer && !remoteDescSetRef.current) {
        remoteDescSetRef.current = true;
        try {
          await pcRef.current?.setRemoteDescription(new RTCSessionDescription(call.answer));
        } catch {}
      }

      const remote = role === 'caller' ? call.calleeCandidates : call.callerCandidates;
      const all = remote || [];
      if (remoteDescSetRef.current && all.length > appliedCandidatesRef.current) {
        const fresh = all.slice(appliedCandidatesRef.current);
        appliedCandidatesRef.current = all.length;
        await applyRemoteCandidates(fresh);
      }
    });
  }, [applyRemoteCandidates, onStateChange, stopWatch]);

  // ─── CALLER ───────────────────────────────────────────────────────────────
  const startCall = useCallback(async ({ conversation, currentUser, callType = 'audio' }) => {
    cleanup();
    setConnState('connecting');

    const constraints = callType === 'video'
      ? { audio: true, video: { width: 1280, height: 720, facingMode: 'user' } }
      : { audio: true };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    localStreamRef.current = stream;

    const myKey = currentUser?.id;
    const pc = createPC('caller', myKey);
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));

    const offer = await pc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: callType === 'video',
    });
    await pc.setLocalDescription(offer);
    await waitForIce(pc);

    const ids = conversation?.participant_ids || [];
    const calleeId = ids.find((id) => id !== myKey);
    const calleeName = conversation?.participant_names?.[ids.indexOf(calleeId)] || conversation?.participant_name;

    const callId = await convexChat.startCall({
      ...(conversation?.id ? { conversationId: conversation.id } : {}),
      callerId: myKey,
      calleeId,
      callerName: currentUser?.full_name || myKey,
      calleeName: calleeName || 'Contact',
      isVideo: callType === 'video',
      offer: JSON.parse(JSON.stringify(pc.localDescription)),
    });
    callIdRef.current = callId;
    watchCall(callId, 'caller');

    return { session: { id: callId }, stream };
  }, [cleanup, createPC, watchCall]);

  // ─── CALLEE ───────────────────────────────────────────────────────────────
  const answerCall = useCallback(async ({ incomingSession, currentUser }) => {
    cleanup();
    setConnState('connecting');

    const callType = incomingSession.call_type || (incomingSession.isVideo ? 'video' : 'audio');
    const constraints = callType === 'video'
      ? { audio: true, video: { width: 1280, height: 720, facingMode: 'user' } }
      : { audio: true };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    localStreamRef.current = stream;

    const myKey = currentUser?.id;
    const pc = createPC('callee', myKey);
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));

    callIdRef.current = incomingSession.id;

    const call = await convexChat.query
      ? await convexChat.watchOnce?.(incomingSession.id)
      : null;

    const offer = incomingSession.offer;
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    remoteDescSetRef.current = true;

    const early = incomingSession.callerCandidates || [];
    appliedCandidatesRef.current = early.length;
    await applyRemoteCandidates(early);

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    await waitForIce(pc);

    await convexChat.answerCall({
      callId: incomingSession.id,
      answer: JSON.parse(JSON.stringify(pc.localDescription)),
    });

    watchCall(incomingSession.id, 'callee');
    void call;

    return { stream };
  }, [cleanup, createPC, applyRemoteCandidates, watchCall]);

  const hangUp = useCallback(async () => {
    if (callIdRef.current) {
      await convexChat.updateCallStatus({ callId: callIdRef.current, status: 'ended' }).catch(() => {});
    }
    cleanup();
  }, [cleanup]);

  const declineCall = useCallback(async (callId) => {
    if (callId) {
      await convexChat.updateCallStatus({ callId, status: 'declined' }).catch(() => {});
    }
    cleanup();
  }, [cleanup]);

  const setMuted = useCallback((muted) => {
    localStreamRef.current?.getAudioTracks().forEach((t) => { t.enabled = !muted; });
  }, []);

  const setCameraOff = useCallback((off) => {
    localStreamRef.current?.getVideoTracks().forEach((t) => { t.enabled = !off; });
  }, []);

  const getLocalStream = useCallback(() => localStreamRef.current, []);
  const getPeerConnection = useCallback(() => pcRef.current, []);

  // Presence of the call doc replaces the old heartbeat columns; kept as no-ops
  // so callers don't need to change their lifecycle handling.
  const startHeartbeat = useCallback(() => null, []);
  const watchHeartbeat = useCallback(() => null, []);

  useEffect(() => () => cleanup(), [cleanup]);

  return {
    connState,
    startCall,
    answerCall,
    hangUp,
    declineCall,
    setMuted,
    setCameraOff,
    getLocalStream,
    getPeerConnection,
    startHeartbeat,
    watchHeartbeat,
  };
}
