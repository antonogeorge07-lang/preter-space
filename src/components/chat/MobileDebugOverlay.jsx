import { useCallback, useEffect, useState } from 'react';
import { Ruler, X } from 'lucide-react';

const STORAGE_KEY = 'preter_mobile_debug';

/**
 * Mobile layout debug overlay.
 * - Highlights the four safe-area insets.
 * - Outlines any element whose box escapes the viewport width (horizontal overflow).
 * - Shows live viewport / keyboard / safe-area numbers.
 *
 * Toggle: floating ruler button, or ?debug=1 in the URL.
 */
export default function MobileDebugOverlay() {
  const [enabled, setEnabled] = useState(false);
  const [info, setInfo] = useState(null);
  const [offenders, setOffenders] = useState([]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('debug') === '1' || localStorage.getItem(STORAGE_KEY) === '1') setEnabled(true);
  }, []);

  const toggle = useCallback(() => {
    setEnabled((v) => {
      const next = !v;
      localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      return next;
    });
  }, []);

  const measure = useCallback(() => {
    const cs = getComputedStyle(document.documentElement);
    const px = (v) => Math.round(parseFloat(v || '0')) || 0;
    const probe = document.createElement('div');
    probe.style.cssText =
      'position:fixed;top:0;left:0;width:0;height:0;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);';
    document.body.appendChild(probe);
    const p = getComputedStyle(probe);
    const safe = {
      top: px(p.paddingTop),
      right: px(p.paddingRight),
      bottom: px(p.paddingBottom),
      left: px(p.paddingLeft),
    };
    probe.remove();

    const vw = window.innerWidth;
    const found = [];
    document.querySelectorAll('body *').forEach((el) => {
      if (el.closest('[data-debug-overlay]')) return;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      if (r.right > vw + 1 || r.left < -1) {
        found.push({
          tag: el.tagName.toLowerCase(),
          cls: (el.className || '').toString().slice(0, 40),
          left: Math.round(r.left),
          right: Math.round(r.right),
          top: Math.round(r.top),
          height: Math.round(r.height),
          width: Math.round(r.width),
        });
      }
    });

    setOffenders(found.slice(0, 12));
    setInfo({
      safe,
      vw,
      vh: window.innerHeight,
      vvh: Math.round(window.visualViewport?.height || window.innerHeight),
      kb: px(cs.getPropertyValue('--kb-inset')),
      appHeight: px(cs.getPropertyValue('--app-height')),
      dpr: window.devicePixelRatio,
      scrollW: document.documentElement.scrollWidth,
    });
  }, []);

  useEffect(() => {
    if (!enabled) {
      setOffenders([]);
      setInfo(null);
      return;
    }
    measure();
    const id = setInterval(measure, 700);
    window.addEventListener('resize', measure);
    window.visualViewport?.addEventListener('resize', measure);
    return () => {
      clearInterval(id);
      window.removeEventListener('resize', measure);
      window.visualViewport?.removeEventListener('resize', measure);
    };
  }, [enabled, measure]);

  return (
    <div data-debug-overlay>
      <button
        onClick={toggle}
        aria-label={enabled ? 'Hide layout debug overlay' : 'Show layout debug overlay'}
        className="fixed z-[999] rounded-full p-2 shadow-lg opacity-60 hover:opacity-100 transition-opacity"
        style={{
          right: 10,
          bottom: 'calc(74px + env(safe-area-inset-bottom))',
          background: 'var(--surface-bg)',
          border: '1px solid var(--surface-border)',
          color: enabled ? 'var(--primary)' : 'var(--muted)',
        }}
      >
        {enabled ? <X className="w-3.5 h-3.5" /> : <Ruler className="w-3.5 h-3.5" />}
      </button>

      {enabled && (
        <div className="fixed inset-0 z-[998] pointer-events-none">
          {/* Safe-area bands */}
          <div className="absolute left-0 right-0 top-0" style={{ height: 'env(safe-area-inset-top)', background: 'rgba(236,72,153,0.28)' }} />
          <div className="absolute left-0 right-0 bottom-0" style={{ height: 'env(safe-area-inset-bottom)', background: 'rgba(236,72,153,0.28)' }} />
          <div className="absolute top-0 bottom-0 left-0" style={{ width: 'env(safe-area-inset-left)', background: 'rgba(59,130,246,0.28)' }} />
          <div className="absolute top-0 bottom-0 right-0" style={{ width: 'env(safe-area-inset-right)', background: 'rgba(59,130,246,0.28)' }} />

          {/* Keyboard inset band */}
          <div
            className="absolute left-0 right-0 bottom-0"
            style={{ height: 'var(--kb-inset, 0px)', background: 'rgba(16,185,129,0.18)', borderTop: '1px dashed rgba(16,185,129,0.7)' }}
          />

          {/* Overflow bounds */}
          {offenders.map((o, i) => (
            <div
              key={i}
              className="absolute"
              style={{
                left: o.left,
                top: o.top,
                width: o.width,
                height: o.height,
                outline: '2px solid rgba(239,68,68,0.9)',
                background: 'rgba(239,68,68,0.1)',
              }}
            />
          ))}

          {info && (
            <div
              className="absolute left-2 top-2 rounded-lg px-2 py-1.5 text-[10px] leading-tight font-mono max-w-[70vw] overflow-hidden"
              style={{ background: 'rgba(0,0,0,0.78)', color: '#e5e7eb' }}
            >
              <div>vw {info.vw} / scrollW {info.scrollW} {info.scrollW > info.vw ? '(H-OVERFLOW)' : '(ok)'}</div>
              <div>vh {info.vh} / vvh {info.vvh} / app {info.appHeight}</div>
              <div>kb {info.kb} | safe t{info.safe.top} r{info.safe.right} b{info.safe.bottom} l{info.safe.left}</div>
              <div>offenders {offenders.length}</div>
              {offenders.slice(0, 4).map((o, i) => (
                <div key={i} className="truncate opacity-80">
                  {o.tag}.{o.cls} [{o.left}→{o.right}]
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
