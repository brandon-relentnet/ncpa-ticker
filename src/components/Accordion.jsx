import { motion as Motion, MotionConfig } from "motion/react";
import { ChevronDown } from "lucide-react";
import { useId, useState } from "react";

export function Accordion({ children, className = "", transition }) {
  const wrapperClass = [
    "surface-card divide-y overflow-hidden",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <MotionConfig
      transition={
        transition ?? {
          duration: 0.65,
          ease: [0.22, 1, 0.36, 1],
        }
      }
    >
      <div
        className={wrapperClass}
        style={{ divideColor: "var(--border-subtle)" }}
      >
        {children}
      </div>
    </MotionConfig>
  );
}

export function AccordionItem({ title, icon, children, defaultOpen = false }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const id = useId();

  return (
    <Motion.section
      initial={false}
      animate={isOpen ? "open" : "closed"}
      className="group overflow-hidden p-4"
    >
      <h3>
        <Motion.button
          type="button"
          id={`${id}-button`}
          aria-expanded={isOpen}
          aria-controls={id}
          onClick={() => setIsOpen((value) => !value)}
          className="flex w-full cursor-pointer items-center justify-between gap-4 bg-transparent py-4 transition focus-visible:outline focus-visible:outline-offset-2"
          style={{
            color: "var(--text-primary)",
            outlineColor: "var(--accent)",
          }}
        >
          <span className="flex items-center gap-2.5 font-display text-sm font-bold uppercase tracking-wider">
            {icon && (
              <span style={{ color: "var(--accent)" }}>{icon}</span>
            )}
            {title}
          </span>
          <Motion.span
            variants={{ open: { rotate: 180 }, closed: { rotate: 0 } }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="transition-colors"
            style={{ color: "var(--text-muted)" }}
          >
            <ChevronDown size={20} />
          </Motion.span>
        </Motion.button>
      </h3>
      <Motion.div
        id={id}
        aria-labelledby={`${id}-button`}
        className="overflow-hidden"
        variants={{
          open: {
            height: "auto",
            marginBottom: "1.5rem",
          },
          closed: {
            height: 0,
            marginBottom: 0,
          },
        }}
      >
        <Motion.div
          variants={{
            open: { opacity: 1, filter: "blur(0px)", y: 0 },
            closed: { opacity: 0, filter: "blur(4px)", y: -8 },
          }}
          className="space-y-5 pt-2 text-sm"
          style={{ color: "var(--text-secondary)" }}
        >
          {children}
        </Motion.div>
      </Motion.div>
    </Motion.section>
  );
}

export default Accordion;
