import { useRef, useState } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { Reply } from 'lucide-react';

const SWIPE_THRESHOLD = 64; // px to trigger reply

export default function SwipeableMessage({ children, onReply, isMe }) {
  const x = useMotionValue(0);
  const opacity = useTransform(x, isMe ? [-SWIPE_THRESHOLD, -20] : [20, SWIPE_THRESHOLD], [1, 0]);
  const iconX = useTransform(x, isMe ? [-SWIPE_THRESHOLD, -20] : [20, SWIPE_THRESHOLD], isMe ? [-8, 8] : [8, -8]);
  const triggered = useRef(false);
  const [swiping, setSwiping] = useState(false);

  const handleDragEnd = () => {
    const val = x.get();
    const reached = isMe ? val < -SWIPE_THRESHOLD : val > SWIPE_THRESHOLD;
    if (reached && !triggered.current) {
      triggered.current = true;
      onReply?.();
    }
    triggered.current = false;
    animate(x, 0, { type: 'spring', stiffness: 400, damping: 30 });
    setSwiping(false);
  };

  return (
    <div className="relative overflow-hidden">
      {/* Reply hint icon */}
      <motion.div
        style={{ opacity, x: iconX }}
        className={`absolute top-1/2 -translate-y-1/2 ${isMe ? 'left-3' : 'right-3'} pointer-events-none`}
      >
        <div className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: 'var(--accent-pink)' }}>
          <Reply className="w-4 h-4" style={{ color: 'var(--primary)' }} />
        </div>
      </motion.div>

      <motion.div
        drag="x"
        dragConstraints={{ left: isMe ? -SWIPE_THRESHOLD - 10 : 0, right: isMe ? 0 : SWIPE_THRESHOLD + 10 }}
        dragElastic={0.15}
        style={{ x }}
        onDragStart={() => setSwiping(true)}
        onDragEnd={handleDragEnd}
      >
        {children}
      </motion.div>
    </div>
  );
}