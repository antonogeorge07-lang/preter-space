import { db } from '@/lib/db';

/**
 * useWebRTC — reusable WebRTC hook that uses CallSession as signaling.
 * Supports both audio and video calls with trickle ICE.
 */
import { useRef, useState, useCallback, useEffect } from 'react';

// STUN + free public TURN servers for firewall traversal
// TURN is critical for users behind symmetric NAT or strict corporate firewalls
const ICE_SERVERS = [
  // STUN
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
  // Free public TURN — Open Relay Project (no auth required)
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
  const sessionIdRef = useRef(null);
  const pollRef = useRef(null);
  const pendingCandidatesRef = useRef([]);
  const remoteDescSetRef = useRef(false);
  const [connState, setConnState] = useState('idle'); // idle|connecting|connected|reconnecting|failed|ended

  const stopPoll = useCallback(() => {
    clearInterval(pollRef.current);
    pollRef.current = null;
  }, []);

  const cleanup = useCallback(() => {
    stopPoll();
    if (pcRef.current) {
      pcRef.current.onicecandidate = null;
      pcRef.current.ontrack = null;
      pcRef.current.onconnectionstatechange = null;
      pcRef.current.close();
      pcRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    sessionIdRef.current = null;
    remoteDescSetRef.current = false;
    pendingCandidatesRef.current = [];
    setConnState('idle');
  }, [stopPoll]);

  const createPC = useCallback(() => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS, iceCandidatePoolSize: 10 });

    pc.ontrack = (e) => {
      if (onRemoteStream) onRemoteStream(e.streams[0]);
    };

    pc.onconnectionstatechange = () => {
      const s = pc.connectionState;
      const mapped = s === 'connected' ? 'connected'
        : s === 'disconnected' || s === 'failed' ? 'failed'
        : s === 'closed' ? 'ended'
        : 'connecting';
      setConnState(mapped);
      if (onStateChange) onStateChange(mapped);
    };

    // Trickle ICE — push candidates to DB as they arrive
    pc.onicecandidate = async (e) => {
      if (!e.candidate || !sessionIdRef.current) return;
      // We'll flush these in batches by re-reading + appending
      pendingCandidatesRef.current.push(e.candidate.toJSON());
    };

    pcRef.current = pc;
    return pc;
  }, [onRemoteStream, onStateChange]);

  // Flush local ICE candidates to DB every 500ms
  const startIceFlush = useCallback((role) => {
    const flush = setInterval(async () => {
      if (!sessionIdRef.current || pendingCandidatesRef.current.length === 0) return;
      const toSend = [...pendingCandidatesRef.current];
      pendingCandidatesRef.current = [];
      const session = await db.entities.CallSession.get(sessionIdRef.current);
      const existing = role === 'caller'
        ? JSON.parse(session.ice_candidates_caller || '[]')
        : JSON.parse(session.ice_candidates_callee || '[]');
      const field = role === 'caller' ? 'ice_candidates_caller' : 'ice_candidates_callee';
      await db.entities.CallSession.update(sessionIdRef.current, {
        [field]: JSON.stringify([...existing, ...toSend])
      });
    }, 500);
    return flush;
  }, []);

  const applyRemoteCandidates = useCallback(async (candidates) => {
    if (!pcRef.current || !remoteDescSetRef.current) return;
    for (const c of candidates) {
      try { await pcRef.current.addIceCandidate(new RTCIceCandidate(c)); } catch {}
    }
  }, []);

  // ─── CALLER ───────────────────────────────────────────────────────────────
  const startCall = useCallback(async ({ conversation, currentUser, callType = 'audio' }) => {
    cleanup();
    setConnState('connecting');

    const constraints = callType === 'video'
      ? { audio: true, video: { width: 1280, height: 720, facingMode: 'user' } }
      : { audio: true };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    localStreamRef.current = stream;

    const pc = createPC();
    stream.getTracks().forEach(t => pc.addTrack(t, stream));

    // Create offer
    const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: callType === 'video' });
    await pc.setLocalDescription(offer);

    // Wait for ICE gathering to complete (max 3s)
    await Promise.race([
      new Promise(res => {
        if (pc.iceGatheringState === 'complete') return res();
        pc.onicegatheringstatechange = () => { if (pc.iceGatheringState === 'complete') res(); };
      }),
      new Promise(res => setTimeout(res, 3000)),
    ]);

    const otherId = conversation?.participant_ids?.find(id => id !== currentUser?.id);
    const callee = conversation?.participant_names?.find((_, i) => conversation.participant_ids[i] !== currentUser?.id) || conversation?.participant_name;

    const session = await db.entities.CallSession.create({
      conversation_id: conversation.id,
      caller_id: currentUser.id,
      caller_name: currentUser.full_name || currentUser.email,
      callee_id: otherId,
      callee_name: callee || 'Contact',
      call_type: callType,
      status: 'ringing',
      offer_sdp: JSON.stringify(pc.localDescription),
      ice_candidates_caller: JSON.stringify([]),
      started_at: new Date().toISOString(),
    });
    sessionIdRef.current = session.id;

    const iceFlushTimer = startIceFlush('caller');

    let appliedCalleeCandidateCount = 0;

    // Poll for answer + callee ICE
    pollRef.current = setInterval(async () => {
      const updated = await db.entities.CallSession.get(session.id);

      if (updated.status === 'declined' || updated.status === 'ended' || updated.status === 'busy') {
        stopPoll(); clearInterval(iceFlushTimer);
        setConnState('ended');
        if (onStateChange) onStateChange('ended:' + updated.status);
        return;
      }

      if (updated.answer_sdp && !remoteDescSetRef.current) {
        remoteDescSetRef.current = true;
        const answer = JSON.parse(updated.answer_sdp);
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
      }

      if (remoteDescSetRef.current && updated.ice_candidates_callee) {
        const all = JSON.parse(updated.ice_candidates_callee);
        const newOnes = all.slice(appliedCalleeCandidateCount);
        if (newOnes.length > 0) {
          appliedCalleeCandidateCount += newOnes.length;
          await applyRemoteCandidates(newOnes);
        }
      }
    }, 1500);

    return { session, stream };
  }, [cleanup, createPC, startIceFlush, stopPoll, applyRemoteCandidates, onStateChange]);

  // ─── CALLEE ───────────────────────────────────────────────────────────────
  const answerCall = useCallback(async ({ incomingSession, currentUser }) => {
    cleanup();
    setConnState('connecting');

    const callType = incomingSession.call_type || 'audio';
    const constraints = callType === 'video'
      ? { audio: true, video: { width: 1280, height: 720, facingMode: 'user' } }
      : { audio: true };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    localStreamRef.current = stream;

    const pc = createPC();
    stream.getTracks().forEach(t => pc.addTrack(t, stream));

    const offer = JSON.parse(incomingSession.offer_sdp);
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    remoteDescSetRef.current = true;

    // Apply any early ICE candidates from caller
    if (incomingSession.ice_candidates_caller) {
      await applyRemoteCandidates(JSON.parse(incomingSession.ice_candidates_caller));
    }

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    await Promise.race([
      new Promise(res => {
        if (pc.iceGatheringState === 'complete') return res();
        pc.onicegatheringstatechange = () => { if (pc.iceGatheringState === 'complete') res(); };
      }),
      new Promise(res => setTimeout(res, 3000)),
    ]);

    sessionIdRef.current = incomingSession.id;

    await db.entities.CallSession.update(incomingSession.id, {
      status: 'active',
      answer_sdp: JSON.stringify(pc.localDescription),
      ice_candidates_callee: JSON.stringify([]),
    });

    const iceFlushTimer = startIceFlush('callee');
    let appliedCallerCandidateCount = incomingSession.ice_candidates_caller
      ? JSON.parse(incomingSession.ice_candidates_caller).length
      : 0;

    // Poll for new caller ICE + call end
    pollRef.current = setInterval(async () => {
      const updated = await db.entities.CallSession.get(incomingSession.id);
      if (updated.status === 'ended') {
        stopPoll(); clearInterval(iceFlushTimer);
        setConnState('ended');
        if (onStateChange) onStateChange('ended:ended');
        return;
      }
      if (updated.ice_candidates_caller) {
        const all = JSON.parse(updated.ice_candidates_caller);
        const newOnes = all.slice(appliedCallerCandidateCount);
        if (newOnes.length > 0) {
          appliedCallerCandidateCount += newOnes.length;
          await applyRemoteCandidates(newOnes);
        }
      }
    }, 1500);

    return { stream };
  }, [cleanup, createPC, startIceFlush, stopPoll, applyRemoteCandidates, onStateChange]);

  // Heartbeat — caller writes a timestamp every 8s so callee can detect disconnect
  const startHeartbeat = useCallback((sessionId, role) => {
    const interval = setInterval(async () => {
      if (!sessionId) return;
      try {
        await db.entities.CallSession.update(sessionId, {
          [`${role}_heartbeat`]: new Date().toISOString(),
        });
      } catch {}
    }, 8000);
    return interval;
  }, []);

  // Watch for stale heartbeat — if other side hasn't updated in 20s, end call
  const watchHeartbeat = useCallback((sessionId, watchField, onStale) => {
    const interval = setInterval(async () => {
      try {
        const s = await db.entities.CallSession.get(sessionId);
        const ts = s[watchField];
        if (ts && Date.now() - new Date(ts).getTime() > 20000) {
          onStale();
        }
      } catch {}
    }, 10000);
    return interval;
  }, []);

  const hangUp = useCallback(async () => {
    if (sessionIdRef.current) {
      await db.entities.CallSession.update(sessionIdRef.current, {
        status: 'ended',
        ended_at: new Date().toISOString(),
      });
    }
    cleanup();
  }, [cleanup]);

  const declineCall = useCallback(async (sessionId) => {
    if (sessionId) {
      await db.entities.CallSession.update(sessionId, { status: 'declined' });
    }
    cleanup();
  }, [cleanup]);

  const setMuted = useCallback((muted) => {
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !muted; });
  }, []);

  const setCameraOff = useCallback((off) => {
    localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = !off; });
  }, []);

  const getLocalStream = useCallback(() => localStreamRef.current, []);
  const getPeerConnection = useCallback(() => pcRef.current, []);

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