import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, PhoneOff, Video } from 'lucide-react';
import { useIncomingCalls } from '@/hooks/useConvexChat';
import { convexChat } from '@/lib/convexChat';
import CallAvatar from '@/components/chat/CallAvatar';

export default function IncomingCallBanner({ currentUser, conversations, onAnswer }) {
  const [dismissedIds, setDismissedIds] = useState([]);
  const ringtoneRef = useRef(null);
  const ringingForRef = useRef(null);

  // Live Convex subscription to ringing calls addressed to me
  const calls = useIncomingCalls(currentUser?.id);
  const call = calls.find((c) => !dismissedIds.includes(c._id)) || null;
  const conv = call ? conversations.find((c) => c.id === call.conversationId) : null;
  const incomingCall = call
    ? {
        session: {
          ...call,
          id: call._id,
          call_type: call.isVideo ? 'video' : 'audio',
          caller_name: call.callerName || call.callerId,
        },
        conv,
      }
    : null;

  // Ringtone whenever a new call arrives
  useEffect(() => {
    if (!call) { ringingForRef.current = null; return; }
    if (ringingForRef.current === call._id) return;
    ringingForRef.current = call._id;
    try {
      const ctx = new AudioContext();
      ctx.resume?.().catch(() => {});

      const playBeep = (freq, t) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
        osc.start(t); osc.stop(t + 0.4);
      };
      for (let i = 0; i < 6; i++) {
        playBeep(880, ctx.currentTime + i * 0.7);
        playBeep(1100, ctx.currentTime + i * 0.7 + 0.2);
      }
      ringtoneRef.current = ctx;
    } catch {}
  }, [call?._id]);

  const stopRingtone = () => {
    try { ringtoneRef.current?.close(); } catch {}
    ringtoneRef.current = null;
  };

  const decline = async () => {
    stopRingtone();
    if (incomingCall) {
      setDismissedIds((prev) => [...prev, incomingCall.session.id]);
      await convexChat
        .updateCallStatus({ callId: incomingCall.session.id, status: 'declined' })
        .catch(() => {});
    }
  };

  const answer = () => {
    stopRingtone();
    if (incomingCall) {
      setDismissedIds((prev) => [...prev, incomingCall.session.id]);
      onAnswer(incomingCall.session, incomingCall.conv);
    }
  };

  if (!incomingCall) return null;
  const isVideo = incomingCall.session?.call_type === 'video';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -100, opacity: 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        className="fixed top-4 left-1/2 -translate-x-1/2 z-[70] w-[340px] rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: 'rgba(49,46,129,0.92)', backdropFilter: 'blur(30px)', border: '1px solid rgba(255,255,255,0.16)' }}
      >
        {/* Pulsing ring animation */}
        <div className="absolute inset-0 rounded-2xl ring-animation pointer-events-none" />

        <div className="relative z-10 flex items-center gap-3 p-4">
          <div className="relative flex-shrink-0">
            <CallAvatar
              avatar={incomingCall.conv?.participant_avatar}
              name={incomingCall.session.caller_name}
              className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-400 flex items-center justify-center text-2xl shadow-lg overflow-hidden"
            />
            <motion.div
              animate={{ scale: [1, 1.5, 1], opacity: [0.6, 0, 0.6] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="absolute inset-0 rounded-2xl bg-green-400/40 pointer-events-none"
            />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm truncate">{incomingCall.session.caller_name}</p>
            <p className="text-white/50 text-xs flex items-center gap-1 mt-0.5">
              {isVideo ? <Video className="w-3 h-3" /> : <Phone className="w-3 h-3" />}
              Incoming {isVideo ? 'video' : 'voice'} call
            </p>
          </div>

          <div className="flex gap-2 flex-shrink-0">
            <motion.button type="button" whileTap={{ scale: 0.9 }} onClick={decline}
              className="relative z-50 pointer-events-auto w-11 h-11 rounded-full bg-red-500 flex items-center justify-center shadow-lg shadow-red-500/30">
              <PhoneOff className="w-5 h-5 text-white" />
            </motion.button>
            <motion.button type="button" whileTap={{ scale: 0.9 }} onClick={answer}
              className="relative z-50 pointer-events-auto w-11 h-11 rounded-full bg-green-400 flex items-center justify-center shadow-lg shadow-green-400/30">
              {isVideo ? <Video className="w-5 h-5 text-white" /> : <Phone className="w-5 h-5 text-white" />}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}