import { db } from '@/lib/db';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, PhoneOff, Video } from 'lucide-react';

export default function IncomingCallBanner({ currentUser, conversations, onAnswer }) {
  const [incomingCall, setIncomingCall] = useState(null);
  const seenRef = useRef(new Set());
  const ringtoneRef = useRef(null);

  // Use real-time subscription instead of polling
  useEffect(() => {
    if (!currentUser) return;

    const unsubscribe = db.entities.CallSession.subscribe((event) => {
      const s = event.data;
      if (
        event.type === 'create' &&
        s.callee_id === currentUser.id &&
        s.status === 'ringing' &&
        !seenRef.current.has(s.id)
      ) {
        seenRef.current.add(s.id);
        const conv = conversations.find(c => c.id === s.conversation_id);
        setIncomingCall({ session: s, conv });
        // Play ringtone
        try {
          const ctx = new AudioContext();
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
      }

      // Auto-clear if caller cancels
      if (event.type === 'update' && s.status !== 'ringing') {
        setIncomingCall(prev => (prev?.session?.id === s.id ? null : prev));
      }
    });

    // Also poll as fallback (for missed subscribe events)
    const fallback = setInterval(async () => {
      if (!currentUser) return;
      try {
        const sessions = await db.entities.CallSession.filter({ callee_id: currentUser.id, status: 'ringing' });
        const fresh = sessions.find(s => !seenRef.current.has(s.id));
        if (fresh) {
          seenRef.current.add(fresh.id);
          const conv = conversations.find(c => c.id === fresh.conversation_id);
          setIncomingCall({ session: fresh, conv });
        }
      } catch {}
    }, 5000);

    return () => { unsubscribe(); clearInterval(fallback); };
  }, [currentUser?.id]); // only re-run when user changes, not on every conversation update

  const stopRingtone = () => {
    try { ringtoneRef.current?.close(); } catch {}
    ringtoneRef.current = null;
  };

  const decline = async () => {
    stopRingtone();
    if (incomingCall) {
      await db.entities.CallSession.update(incomingCall.session.id, { status: 'declined' });
    }
    setIncomingCall(null);
  };

  const answer = () => {
    stopRingtone();
    if (incomingCall) {
      onAnswer(incomingCall.session, incomingCall.conv);
      setIncomingCall(null);
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

        <div className="flex items-center gap-3 p-4">
          <div className="relative flex-shrink-0">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-400 flex items-center justify-center text-2xl shadow-lg">
              {incomingCall.conv?.participant_avatar || '🧑'}
            </div>
            <motion.div
              animate={{ scale: [1, 1.5, 1], opacity: [0.6, 0, 0.6] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="absolute inset-0 rounded-2xl bg-green-400/40"
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
            <motion.button whileTap={{ scale: 0.9 }} onClick={decline}
              className="w-11 h-11 rounded-full bg-red-500 flex items-center justify-center shadow-lg shadow-red-500/30">
              <PhoneOff className="w-5 h-5 text-white" />
            </motion.button>
            <motion.button whileTap={{ scale: 0.9 }} onClick={answer}
              className="w-11 h-11 rounded-full bg-green-400 flex items-center justify-center shadow-lg shadow-green-400/30">
              {isVideo ? <Video className="w-5 h-5 text-white" /> : <Phone className="w-5 h-5 text-white" />}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}