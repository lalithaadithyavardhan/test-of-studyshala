/**
 * TourTooltip.jsx — v2
 * ====================
 * Fixed positioning: tooltip always stays fully within viewport.
 * Measures the ACTUAL rendered tooltip height after mount, then
 * repositions if it clips the bottom edge. Falls back to centred
 * modal when no target selector or when nothing fits.
 */
import { useEffect, useState, useRef, useCallback } from 'react';
import { MdClose, MdArrowForward, MdArrowBack, MdTour } from 'react-icons/md';
import './TourTooltip.css';

const GAP    = 14;  // px gap between target and tooltip
const MARGIN = 12;  // px min distance from viewport edges

// ── Main component ─────────────────────────────────────────────────────────
const TourTooltip = ({ steps, onFinish }) => {
  const [step,       setStep]       = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const [visible,    setVisible]    = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0, width: 300 });
  const [placement,  setPlacement]  = useState('center'); // 'above' | 'below' | 'center'
  const tooltipRef = useRef(null);

  const current = steps[step];

  // ── Step 1: scroll target into view, then measure it ─────────────────────
  const measureAndPosition = useCallback(() => {
    if (!current?.selector) {
      setTargetRect(null);
      setPlacement('center');
      return;
    }

    const el = document.querySelector(current.selector);
    if (!el) {
      setTargetRect(null);
      setPlacement('center');
      return;
    }

    // Scroll first, then measure AFTER scroll settles
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Wait for scroll animation to finish before measuring
    setTimeout(() => {
      const r   = el.getBoundingClientRect();
      const rect = {
        top: r.top, left: r.left,
        right: r.right, bottom: r.bottom,
        width: r.width, height: r.height,
      };
      setTargetRect(rect);

      // Position is calculated after tooltip renders (see second useEffect below)
    }, 450);
  }, [current?.selector]);

  // On step change: hide → scroll/measure → show
  useEffect(() => {
    setVisible(false);
    const t = setTimeout(() => {
      measureAndPosition();
      // Show after measuring
      setTimeout(() => setVisible(true), 500);
    }, 100);
    return () => clearTimeout(t);
  }, [step]);

  // Re-measure on resize
  useEffect(() => {
    const h = () => measureAndPosition();
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, [measureAndPosition]);

  // ── Step 2: once tooltip is rendered, measure its actual height ───────────
  // then compute final position that keeps it fully on screen
  useEffect(() => {
    if (!visible || !tooltipRef.current) return;

    const computePosition = () => {
      const W  = window.innerWidth;
      const H  = window.innerHeight;
      const TW = Math.min(340, W - MARGIN * 2);

      if (!targetRect) {
        // No target — centre on screen
        const th = tooltipRef.current?.offsetHeight || 260;
        setTooltipPos({
          top:   Math.max(MARGIN, (H - th) / 2),
          left:  Math.max(MARGIN, (W - TW) / 2),
          width: TW,
        });
        setPlacement('center');
        return;
      }

      const th = tooltipRef.current?.offsetHeight || 260;

      // Preferred: below the target
      const belowTop = targetRect.bottom + GAP;
      const aboveTop = targetRect.top - GAP - th;

      // Horizontal: align with target left, clamped to viewport
      const leftIdeal = targetRect.left;
      const leftClamped = Math.min(
        Math.max(leftIdeal, MARGIN),
        W - TW - MARGIN
      );

      if (belowTop + th + MARGIN <= H) {
        // Fits below
        setTooltipPos({ top: belowTop, left: leftClamped, width: TW });
        setPlacement('below');
      } else if (aboveTop >= MARGIN) {
        // Fits above
        setTooltipPos({ top: aboveTop, left: leftClamped, width: TW });
        setPlacement('above');
      } else {
        // Neither fits cleanly — centre vertically, offset horizontally if possible
        const centreTop = Math.max(MARGIN, Math.min((H - th) / 2, H - th - MARGIN));

        // Try to place beside the target if there's room
        const rightOfTarget = targetRect.right + GAP;
        const leftOfTarget  = targetRect.left - GAP - TW;

        if (rightOfTarget + TW + MARGIN <= W) {
          setTooltipPos({ top: centreTop, left: rightOfTarget, width: TW });
        } else if (leftOfTarget >= MARGIN) {
          setTooltipPos({ top: centreTop, left: leftOfTarget, width: TW });
        } else {
          // Full fallback — centre on screen
          setTooltipPos({ top: centreTop, left: Math.max(MARGIN, (W - TW) / 2), width: TW });
        }
        setPlacement('center');
      }
    };

    // Small delay to let browser paint the tooltip before measuring its height
    const t = setTimeout(computePosition, 30);
    return () => clearTimeout(t);
  }, [visible, targetRect]);

  const next   = () => { if (step < steps.length - 1) setStep(s => s + 1); else finish(); };
  const prev   = () => setStep(s => Math.max(0, s - 1));
  const finish = () => { setVisible(false); setTimeout(onFinish, 200); };

  // Spotlight clip path — cuts a hole in the overlay around the target
  const spotlight = targetRect
    ? `polygon(
        0% 0%, 100% 0%, 100% 100%, 0% 100%,
        0% ${targetRect.top - 4}px,
        ${targetRect.left - 8}px ${targetRect.top - 8}px,
        ${targetRect.left - 8}px ${targetRect.bottom + 8}px,
        ${targetRect.right + 8}px ${targetRect.bottom + 8}px,
        ${targetRect.right + 8}px ${targetRect.top - 8}px,
        ${targetRect.left - 8}px ${targetRect.top - 8}px,
        0% ${targetRect.top - 4}px
      )`
    : null;

  return (
    <div className={`tour-root ${visible ? 'tour-root--visible' : ''}`}>

      {/* Dim overlay with spotlight hole */}
      <div
        className="tour-overlay"
        style={spotlight ? { clipPath: spotlight } : {}}
        onClick={finish}
      />

      {/* Pulsing highlight ring */}
      {targetRect && (
        <div
          className="tour-highlight"
          style={{
            top:    targetRect.top    - 8,
            left:   targetRect.left   - 8,
            width:  targetRect.width  + 16,
            height: targetRect.height + 16,
          }}
        />
      )}

      {/* Tooltip card — ref lets us measure actual height */}
      <div
        ref={tooltipRef}
        className={`tour-tooltip tour-tooltip--${placement}`}
        style={{
          position: 'fixed',
          top:      tooltipPos.top,
          left:     tooltipPos.left,
          width:    tooltipPos.width,
        }}
      >
        {/* Header */}
        <div className="tour-header">
          <span className="tour-step-badge">{step + 1} / {steps.length}</span>
          <button className="tour-close" onClick={finish} title="Skip tour">
            <MdClose />
          </button>
        </div>

        {/* Content */}
        {current?.emoji && <div className="tour-emoji">{current.emoji}</div>}
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

        {/* Buttons */}
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
            {step === steps.length - 1 ? 'Got it! 🎉' : <>Next <MdArrowForward /></>}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Replay button ──────────────────────────────────────────────────────────
export const TourReplayBtn = ({ onClick }) => (
  <button className="tour-replay-btn" onClick={onClick} title="Replay tour">
    <MdTour />
    <span>Tour</span>
  </button>
);

export default TourTooltip;
