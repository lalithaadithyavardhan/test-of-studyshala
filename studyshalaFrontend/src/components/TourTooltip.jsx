/**
 * TourTooltip.jsx
 * ===============
 * Self-contained guided tour system.
 * - Highlights a target element with a spotlight overlay
 * - Positions tooltip next to the target using getBoundingClientRect
 * - Saves completion to DB (PATCH /api/auth/tour-complete) so it
 *   never shows again on any device after first completion/skip
 * - Works on mobile — collapses to bottom sheet on small screens
 */
import { useEffect, useState, useRef } from 'react';
import { MdClose, MdArrowForward, MdArrowBack, MdTour } from 'react-icons/md';
import './TourTooltip.css';

// ── Positioning ─────────────────────────────────────────────────────────────
const getTooltipStyle = (rect, placement) => {
  if (!rect) return { top: '50%', left: '50%', transform: 'translate(-50%,-50%)' };
  const GAP    = 16;
  const W      = window.innerWidth;
  const H      = window.innerHeight;
  const TW     = Math.min(320, W - 32);
  const TH     = 200; // estimated

  let top, left;

  if (placement === 'bottom' || (rect.bottom + TH + GAP < H)) {
    top  = rect.bottom + GAP;
    left = Math.min(Math.max(rect.left, 16), W - TW - 16);
    if (placement !== 'bottom') placement = 'bottom';
  } else if (rect.top - TH - GAP > 0) {
    top  = rect.top - TH - GAP;
    left = Math.min(Math.max(rect.left, 16), W - TW - 16);
    placement = 'top';
  } else {
    // Centre on screen fallback
    top  = (H - TH) / 2;
    left = (W - TW) / 2;
    placement = 'center';
  }

  return { position: 'fixed', top, left, width: TW };
};

// ── Main component ───────────────────────────────────────────────────────────
const TourTooltip = ({ steps, onFinish }) => {
  const [step,    setStep]    = useState(0);
  const [rect,    setRect]    = useState(null);
  const [visible, setVisible] = useState(false);
  const rafRef = useRef(null);

  const current = steps[step];

  // ── Measure target element ────────────────────────────────────────────────
  const measure = () => {
    if (!current?.selector) { setRect(null); return; }
    const el = document.querySelector(current.selector);
    if (!el) { setRect(null); return; }
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, right: r.right, bottom: r.bottom, width: r.width, height: r.height });
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  useEffect(() => {
    setVisible(false);
    const t = setTimeout(() => { measure(); setVisible(true); }, 300);
    return () => clearTimeout(t);
  }, [step]);

  useEffect(() => {
    const onResize = () => measure();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [step]);

  const next = () => {
    if (step < steps.length - 1) setStep(s => s + 1);
    else finish();
  };
  const prev   = () => setStep(s => Math.max(0, s - 1));
  const finish = () => { setVisible(false); setTimeout(onFinish, 200); };

  const tooltipStyle = getTooltipStyle(rect, current?.placement || 'bottom');

  // Spotlight clip path
  const spotlight = rect
    ? `polygon(
        0% 0%, 100% 0%, 100% 100%, 0% 100%,
        0% ${rect.top}px,
        ${rect.left - 6}px ${rect.top - 6}px,
        ${rect.left - 6}px ${rect.bottom + 6}px,
        ${rect.right + 6}px ${rect.bottom + 6}px,
        ${rect.right + 6}px ${rect.top - 6}px,
        ${rect.left - 6}px ${rect.top - 6}px,
        0% ${rect.top}px
      )`
    : null;

  return (
    <div className={`tour-root ${visible ? 'tour-root--visible' : ''}`}>

      {/* Overlay with spotlight cutout */}
      <div
        className="tour-overlay"
        style={spotlight ? { clipPath: spotlight } : {}}
        onClick={finish}
      />

      {/* Highlight ring around target */}
      {rect && (
        <div
          className="tour-highlight"
          style={{
            top:    rect.top    - 6,
            left:   rect.left   - 6,
            width:  rect.width  + 12,
            height: rect.height + 12,
          }}
        />
      )}

      {/* Tooltip card */}
      <div className="tour-tooltip" style={tooltipStyle}>
        {/* Header */}
        <div className="tour-header">
          <span className="tour-step-badge">{step + 1} / {steps.length}</span>
          <button className="tour-close" onClick={finish} title="Skip tour">
            <MdClose />
          </button>
        </div>

        {/* Content */}
        {current?.emoji && (
          <div className="tour-emoji">{current.emoji}</div>
        )}
        <div className="tour-title">{current?.title}</div>
        <div className="tour-desc">{current?.desc}</div>

        {/* Progress dots */}
        <div className="tour-dots">
          {steps.map((_, i) => (
            <span
              key={i}
              className={`tour-dot ${i === step ? 'tour-dot--active' : ''} ${i < step ? 'tour-dot--done' : ''}`}
              onClick={() => setStep(i)}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="tour-actions">
          {step > 0 && (
            <button className="tour-btn tour-btn--back" onClick={prev}>
              <MdArrowBack /> Back
            </button>
          )}
          <button className="tour-btn tour-btn--skip" onClick={finish}>
            Skip
          </button>
          <button className="tour-btn tour-btn--next" onClick={next}>
            {step === steps.length - 1 ? "Got it! 🎉" : <>Next <MdArrowForward /></>}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Replay button ─────────────────────────────────────────────────────────────
export const TourReplayBtn = ({ onClick }) => (
  <button className="tour-replay-btn" onClick={onClick} title="Replay tour">
    <MdTour />
    <span>Tour</span>
  </button>
);

export default TourTooltip;
