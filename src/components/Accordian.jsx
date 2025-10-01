import { motion, MotionConfig } from "motion/react";
import { useId, useState } from "react";

function Item({ header, children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasFocus, setHasFocus] = useState(false);
  const id = useId();

  return (
    <MotionConfig transition={{ duration: 0.3 }}>
      <motion.section initial={false} animate={isOpen ? "open" : "closed"}>
        <h3>
          <motion.button
            id={id + "-button"}
            aria-expanded={isOpen}
            aria-controls={id}
            onClick={() => setIsOpen(!isOpen)}
            onFocus={onlyKeyboardFocus(() => setHasFocus(true))}
            onBlur={() => setHasFocus(false)}
          >
            <span>{header}</span> <ChevronDownIcon />
            {hasFocus && (
              <motion.div layoutId="focus-ring" className="focus-ring" />
            )}
          </motion.button>
        </h3>
        <motion.div
          variants={{
            open: {
              height: "auto",
              maskImage:
                "linear-gradient(to bottom, black 100%, transparent 100%)",
            },
            closed: {
              height: 0,
              maskImage:
                "linear-gradient(to bottom, black 50%, transparent 100%)",
            },
          }}
          id={id}
          aria-labelledby={id + "-button"}
          className="accordion-content"
        >
          <motion.div
            variants={{
              open: {
                filter: "blur(0px)",
                opacity: 1,
              },
              closed: {
                filter: "blur(2px)",
                opacity: 0,
              },
            }}
          >
            {children}
          </motion.div>
        </motion.div>
        <hr />
      </motion.section>
    </MotionConfig>
  );
}

export default function Accordion() {
  return (
    <>
      <div className="accordion">
        <Item header="What is Motion+?">
          <p>
            Motion+ is a one-time fee, lifetime access membership that unlocks
            the source code for all Motion examples, early access features,
            premium components, and an exclusive Discord community.
          </p>
        </Item>
        <Item header={`What does "lifetime access" mean?`}>
          <p>Just that! No one needs another subscription in their life.</p>
          <p>
            {`Lifetime access means you'll receive all updates to Motion+ as they're released.`}
          </p>
        </Item>
        <Item header="How does the team package work?">
          <p>
            After purchase, you can nominate up to 10 team members to join
            Motion+.
          </p>
        </Item>
      </div>
      <StyleSheet />
    </>
  );
}

/**
 * ==============   Icons   ================
 */
function ChevronDownIcon() {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      variants={{
        open: { rotate: 180 },
        closed: { rotate: 0 },
      }}
    >
      <path d="m6 9 6 6 6-6" />
    </motion.svg>
  );
}

/**
 * ==============   Utils   ================
 */
function onlyKeyboardFocus(callback) {
  return (e) => {
    if (e.type === "focus" && e.target.matches(":focus-visible")) {
      callback();
    }
  };
}

/**
 * ==============   Styles   ================
 */
function StyleSheet() {
  return (
    <style>{`
        .accordion {
            display: flex;
            flex-direction: column;
            margin: 20px;
            background: #0b1011;
            border: 1px solid #1d2628;
            border-radius: 10px;
            min-width: 300px;
            max-width: 500px;
        }

        .accordion section {
            padding: 20px;
            position: relative;
        }

        .accordion h3 {
            margin: 0;
            display: flex;
        }

        .accordion hr {
            margin: 0;
            border: 0;
            border-bottom: 1px solid #1d2628;
            position: absolute;
            bottom: 0;
            left: 20px;
            right: 20px;
            z-index: 0;
        }

        .accordion section:last-child hr {
            display: none;
        }

        .accordion h3 button {
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex: 1;
            position: relative;
        }

        .accordion h3 span,
        .accordion h3 svg {
            text-align: left;
            z-index: 1;
            position: relative;
        }

        .accordion .focus-ring {
            position: absolute;
            inset: -10px;
            background: var(--hue-4-transparent);
            border-radius: 5px;
            z-index: 0;
        }

        .accordion-content {
            overflow: hidden;
        }

        .accordion-content > div {
            padding: 20px 0 0;
        }

        .accordion-content p {
            line-height: 1.5;
            padding: 0;
            margin: 0;
        }
    `}</style>
  );
}
