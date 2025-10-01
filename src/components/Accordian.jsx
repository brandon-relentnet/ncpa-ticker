import { motion as Motion, MotionConfig } from "motion/react";
import { useId, useState } from "react";

export function Accordion({ children, className = "", transition }) {
  const wrapperClass = [
    "divide-y divide-slate-800 overflow-hidden rounded-lg border border-slate-800 bg-slate-900/70",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <MotionConfig
      transition={
        transition ?? {
          duration: 0.3,
          ease: [0.22, 1, 0.36, 1],
        }
      }
    >
      <div className={wrapperClass}>{children}</div>
    </MotionConfig>
  );
}

export function AccordionItem({ title, children, defaultOpen = false }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const id = useId();

  return (
    <Motion.section
      initial={false}
      animate={isOpen ? "open" : "closed"}
      className="group p-4"
    >
      <h3>
        <Motion.button
          type="button"
          id={`${id}-button`}
          aria-expanded={isOpen}
          aria-controls={id}
          onClick={() => setIsOpen((value) => !value)}
          className="flex w-full cursor-pointer items-center justify-between gap-4 bg-transparent py-4 text-slate-200 transition focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-lime-400"
        >
          <span className="text-md font-semibold uppercase tracking-wide">
            {title}
          </span>
          <Motion.span
            variants={{ open: { rotate: 180 }, closed: { rotate: 0 } }}
            className="text-slate-500 transition group-hover:text-slate-300"
          >
            <ChevronDownIcon />
          </Motion.span>
        </Motion.button>
      </h3>
      <Motion.div
        id={id}
        aria-labelledby={`${id}-button`}
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
          className="space-y-5 pt-2 text-sm text-slate-300"
        >
          {children}
        </Motion.div>
      </Motion.div>
    </Motion.section>
  );
}

function ChevronDownIcon() {
  return (
    <Motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      variants={{ open: { rotate: 180 }, closed: { rotate: 0 } }}
    >
      <path d="m6 9 6 6 6-6" />
    </Motion.svg>
  );
}

export default Accordion;
