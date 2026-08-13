import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX, Video, VideoOff, RotateCcw } from 'lucide-react';
import { useWebRTC } from '@/lib/useWebRTC';
import { detectAndTranslate } from '@/lib/translation';
import LiveCaptionOverlay from '@/components/chat/LiveCaptionOverlay';

export default function VoiceCallModal({ isOpen, onClose, conversation, currentUser, callSession: incomingSession, callType = 'audio' }) {
  const [callState, setCallState] = useState('idle'); // idle|ringing|connecting|connected|failed|ended
  const [muted, setMutedState] = useState(false);
  const [cameraOff, setCameraOffState] = useState(false);
  const [speakerOff, setSpeakerOff] = useState(false);
  const [duration, setDuration] = useState(0);
  const [captions, setCaptions] = useState([]);
  const timerRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const startDataRef = useRef(null);
  const dataChannelRef = useRef(null);  // outgoing DataChannel (caller creates it)
  const captionIdRef = useRef(0);

  const isCaller = !incomingSession;
  const isVideo = callType === 'video' || incomingSession?.call_type === 'video';
  const otherName = isCaller
    ? (conversation?.participant_name || 'Contact')
    : (incomingSession?.caller_name || 'Contact');
  const otherAvatar = conversation?.participant_avatar || '🧑';
  const myName = currentUser?.full_name || currentUser?.email || 'Me';
  // Derive recipient language from conversation participant_languages
  const recipientLang = (() => {
    try {
      const langs = JSON.parse(conversation?.participant_languages || '{}');
      const otherId = (conversation?.participant_ids || []).find(id => id !== currentUser?.id);
      return langs[otherId] || conversation?.preferred_language || 'en';
    } catch { return 'en'; }
  })();

  const onRemoteStream = useCallback((stream) => {
    if (isVideo && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = stream;
    } else if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = stream;
    }
  }, [isVideo]);

  const onStateChange = useCallback((state) => {
    if (state === 'connected') {
      setCallState('connected');
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    } else if (state.startsWith('ended') || state === 'failed') {
      setCallState(state.startsWith('ended:declined') ? 'declined' : state === 'failed' ? 'failed' : 'ended');
      clearInterval(timerRef.current);
      setTimeout(onClose, 2000);
    }
  }, [onClose]);

  const heartbeatRef = useRef(null);
  const watchRef = useRef(null);

  const { startCall, answerCall, hangUp, declineCall, setMuted, setCameraOff, getLocalStream, getPeerConnection, startHeartbeat, watchHeartbeat } = useWebRTC({
    onRemoteStream,
    onStateChange,
  });

  // Attach incoming DataChannel handler (callee receives the channel the caller opened)
  const attachIncomingDataChannel = useCallback((pc) => {
    pc.ondatachannel = (event) => {
      const ch = event.channel;
      ch.onmessage = (e) => {
        try {
          const { original, translated, senderName } = JSON.parse(e.data);
          setCaptions(prev => {
            const id = ++captionIdRef.current;
            const next = [...prev, { id, senderName, original, translated }];
            return next.slice(-4); // keep last 4
          });
        } catch {}
      };
    };
  }, []);

  // Broadcast a locally-captured speech chunk through the DataChannel
  const broadcastCaption = useCallback(async (text, targetLang, senderName) => {
    const ch = dataChannelRef.current;
    if (!ch || ch.readyState !== 'open') return;
    const { translatedText } = await detectAndTranslate(text, targetLang);
    ch.send(JSON.stringify({ original: text, translated: translatedText, senderName }));
  }, []);

  // Broadcast my speech as captions when connected and not muted
  useSpeechBroadcast({
    enabled: callState === 'connected' && !muted,
    broadcastCaption,
    targetLang: recipientLang,
    senderName: myName,
  });

  // Show local preview for video
  const attachLocalVideo = useCallback(() => {
    const stream = getLocalStream();
    if (stream && localVideoRef.current && isVideo) {
      localVideoRef.current.srcObject = stream;
    }
  }, [getLocalStream, isVideo]);

  useEffect(() => {
    if (!isOpen) {
      clearInterval(timerRef.current);
      clearInterval(heartbeatRef.current);
      clearInterval(watchRef.current);
      setCallState('idle');
      setDuration(0);
      setMutedState(false);
      setCameraOffState(false);
      setCaptions([]);
      dataChannelRef.current = null;
      return;
    }

    if (isCaller) {
      setCallState('connecting');
      startDataRef.current = { conversation, currentUser, callType: isVideo ? 'video' : 'audio' };
      startCall({ conversation, currentUser, callType: isVideo ? 'video' : 'audio' })
        .then(({ session, stream }) => {
          // Caller creates the DataChannel immediately after startCall
          const pc = getPeerConnection();
          if (pc) {
            const dc = pc.createDataChannel('live_captions_sync');
            dataChannelRef.current = dc;
          }
          setCallState('ringing');
          if (isVideo && localVideoRef.current && stream) localVideoRef.current.srcObject = stream;
          if (session?.id) {
            heartbeatRef.current = startHeartbeat(session.id, 'caller');
            watchRef.current = watchHeartbeat(session.id, 'callee_heartbeat', () => {
              clearInterval(heartbeatRef.current);
              clearInterval(watchRef.current);
              setCallState('ended');
              setTimeout(onClose, 2000);
            });
          }
        })
        .catch(() => setCallState('failed'));
    } else {
      setCallState('ringing');
      // Callee: wait until answerCall gives us the PC, handled in handleAnswer
    }
  }, [isOpen]);

  // Attach local video when stream becomes available
  useEffect(() => {
    if (isVideo) {
      const t = setInterval(() => {
        const s = getLocalStream();
        if (s && localVideoRef.current && !localVideoRef.current.srcObject) {
          localVideoRef.current.srcObject = s;
          clearInterval(t);
        }
      }, 200);
      return () => clearInterval(t);
    }
  }, [isOpen, isVideo, getLocalStream]);

  const handleAnswer = async () => {
    setCallState('connecting');
    answerCall({ incomingSession, currentUser })
      .then(({ stream }) => {
        // Callee attaches the ondatachannel listener to receive captions
        const pc = getPeerConnection();
        if (pc) attachIncomingDataChannel(pc);
        if (isVideo && localVideoRef.current && stream) localVideoRef.current.srcObject = stream;
        if (incomingSession?.id) {
          heartbeatRef.current = startHeartbeat(incomingSession.id, 'callee');
          watchRef.current = watchHeartbeat(incomingSession.id, 'caller_heartbeat', () => {
            clearInterval(heartbeatRef.current);
            clearInterval(watchRef.current);
            setCallState('ended');
            setTimeout(onClose, 2000);
          });
        }
      })
      .catch(() => setCallState('failed'));
  };

  const handleHangUp = async () => {
    clearInterval(timerRef.current);
    clearInterval(heartbeatRef.current);
    clearInterval(watchRef.current);
    await hangUp();
    setCallState('ended');
    setTimeout(onClose, 1000);
  };

  const handleDecline = async () => {
    await declineCall(incomingSession?.id);
    onClose();
  };

  const toggleMute = () => {
    const next = !muted;
    setMutedState(next);
    setMuted(next);
  };

  const toggleCamera = () => {
    const next = !cameraOff;
    setCameraOffState(next);
    setCameraOff(next);
  };

  const formatDuration = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const stateLabel = {
    idle: 'Connecting...',
    connecting: isCaller ? 'Setting up call...' : 'Connecting...',
    ringing: isCaller ? 'Ringing...' : 'Incoming call',
    connected: formatDuration(duration),
    ended: 'Call ended',
    declined: 'Call declined',
    failed: 'Connection failed',
  }[callState] || '...';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center"
          style={{ background: isVideo ? 'black' : 'rgba(0,0,0,0.65)', backdropFilter: isVideo ? 'none' : 'blur(12px)' }}
        >
          {/* Video call — full screen remote video */}
          {isVideo && (
            <video
              ref={remoteVideoRef}
              autoPlay playsInline
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}

          {/* Local video PiP */}
          {isVideo && (
            <motion.div
              drag dragMomentum={false}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="absolute top-4 right-4 w-28 h-40 sm:w-36 sm:h-48 rounded-2xl overflow-hidden border-2 border-white/30 shadow-2xl z-10 cursor-grab"
            >
              <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
              {cameraOff && (
                <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
                  <VideoOff className="w-8 h-8 text-white/50" />
                </div>
              )}
            </motion.div>
          )}

          {/* Call card */}
          <motion.div
            initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
            className={`${isVideo
              ? 'absolute bottom-0 left-0 right-0 p-6 pt-8'
              : 'w-full max-w-sm mx-4 mb-4 sm:mb-0 rounded-3xl p-8'
            } flex flex-col items-center gap-5 shadow-2xl`}
            style={isVideo
              ? { background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)' }
              : { background: 'linear-gradient(135deg, rgba(79,70,229,0.92), rgba(99,102,241,0.92))', backdropFilter: 'blur(40px)', border: '1px solid rgba(255,255,255,0.18)' }
            }
          >
            {/* Avatar — only shown for audio */}
            {!isVideo && (
              <>
                <div className={`w-24 h-24 rounded-3xl bg-white/20 flex items-center justify-center text-5xl shadow-inner ${callState === 'ringing' && !isCaller ? 'animate-bounce' : ''}`}>
                  {otherAvatar}
                </div>
                <div className="text-center">
                  <p className="text-white font-bold text-xl">{otherName}</p>
                  <p className="text-white/70 text-sm mt-1 flex items-center gap-1 justify-center">
                    {callState === 'connected' && <span className="w-2 h-2 rounded-full bg-green-400 inline-block animate-pulse" />}
                    {stateLabel}
                  </p>
                </div>
              </>
            )}

            {isVideo && (
              <p className="text-white font-semibold text-lg self-start">{otherName} · {stateLabel}</p>
            )}

            {/* Active waveform */}
            {callState === 'connected' && !isVideo && (
              <div className="flex items-center gap-1 h-8">
                {[...Array(9)].map((_, i) => (
                  <motion.div key={i}
                    animate={{ scaleY: [0.3, 1, 0.3] }}
                    transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.08 }}
                    className="w-1.5 rounded-full bg-white/70"
                    style={{ height: 28 }}
                  />
                ))}
              </div>
            )}

            {/* Controls */}
            <div className="flex items-center gap-4 mt-1">
              {callState === 'ringing' && !isCaller ? (
                // Incoming — show decline + answer
                <>
                  <div className="flex flex-col items-center gap-1">
                    <motion.button whileTap={{ scale: 0.9 }} onClick={handleDecline}
                      className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center shadow-lg shadow-red-500/40">
                      <PhoneOff className="w-7 h-7 text-white" />
                    </motion.button>
                    <span className="text-white/60 text-xs">Decline</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <motion.button whileTap={{ scale: 0.9 }} onClick={handleAnswer}
                      className="w-16 h-16 rounded-full bg-green-400 flex items-center justify-center shadow-lg shadow-green-400/40">
                      {isVideo ? <Video className="w-7 h-7 text-white" /> : <Phone className="w-7 h-7 text-white" />}
                    </motion.button>
                    <span className="text-white/60 text-xs">Answer</span>
                  </div>
                </>
              ) : (
                // In-call controls
                <>
                  <div className="flex flex-col items-center gap-1">
                    <motion.button whileTap={{ scale: 0.9 }} onClick={toggleMute}
                      className={`w-13 h-13 p-3.5 rounded-full flex items-center justify-center transition-all ${muted ? 'bg-white text-gray-900' : 'bg-white/15 text-white'}`}>
                      {muted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                    </motion.button>
                    <span className="text-white/60 text-xs">{muted ? 'Unmute' : 'Mute'}</span>
                  </div>

                  <div className="flex flex-col items-center gap-1">
                    <motion.button whileTap={{ scale: 0.9 }} onClick={handleHangUp}
                      className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center shadow-lg shadow-red-500/40">
                      <PhoneOff className="w-7 h-7 text-white" />
                    </motion.button>
                    <span className="text-white/60 text-xs">End</span>
                  </div>

                  {isVideo ? (
                    <div className="flex flex-col items-center gap-1">
                      <motion.button whileTap={{ scale: 0.9 }} onClick={toggleCamera}
                        className={`p-3.5 rounded-full flex items-center justify-center transition-all ${cameraOff ? 'bg-white text-gray-900' : 'bg-white/15 text-white'}`}>
                        {cameraOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                      </motion.button>
                      <span className="text-white/60 text-xs">{cameraOff ? 'Camera on' : 'Camera off'}</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      <motion.button whileTap={{ scale: 0.9 }} onClick={() => setSpeakerOff(s => !s)}
                        className={`p-3.5 rounded-full flex items-center justify-center transition-all ${speakerOff ? 'bg-white text-gray-900' : 'bg-white/15 text-white'}`}>
                        {speakerOff ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                      </motion.button>
                      <span className="text-white/60 text-xs">Speaker</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>

          {/* Live caption overlay — shown when connected */}
          {callState === 'connected' && captions.length > 0 && (
            <LiveCaptionOverlay captions={captions} />
          )}

          <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Hook: capture mic speech via Web Speech API and push to DataChannel
function useSpeechBroadcast({ enabled, broadcastCaption, targetLang, senderName }) {
  const recognitionRef = useRef(null);

  useEffect(() => {
    if (!enabled || !broadcastCaption) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onresult = (e) => {
      const text = e.results[e.results.length - 1][0].transcript.trim();
      if (text) broadcastCaption(text, targetLang, senderName);
    };
    recognition.start();
    recognitionRef.current = recognition;

    return () => {
      try { recognition.stop(); } catch {}
    };
  }, [enabled, targetLang, senderName]);
}