import { SITE_NAME } from "@/lib/config";

export function BrandMark() {
  return (
    <span
      aria-hidden
      className="inline-flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-accent-2 text-xs font-bold text-black"
    >
      {SITE_NAME.split(" ").map((w) => w[0]).join("")}
    </span>
  );
}
