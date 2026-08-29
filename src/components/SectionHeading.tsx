import { ReactNode } from "react";

// A translucent accent-green band sitting mostly under the text (like a
// highlighter pen stroke) rather than a full background box — background-size
// is set to a fraction of the element's height and positioned low so letter
// tops stay clear of it.
export function SectionHeading({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <h2
      className={`inline-block font-medium bg-gradient-to-r from-accent-2/30 to-accent-2/30 bg-no-repeat [background-size:100%_40%] [background-position:0_82%] ${className}`}
    >
      {children}
    </h2>
  );
}
