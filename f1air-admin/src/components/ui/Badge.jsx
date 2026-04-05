const variants = {
  green:  "bg-green-500/10 text-green-400 border-green-500/20",
  red:    "bg-red-500/10 text-red-400 border-red-500/20",
  yellow: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  blue:   "bg-blue-500/10 text-blue-400 border-blue-500/20",
  zinc:   "bg-zinc-800 text-zinc-400 border-zinc-700",
  brand:  "bg-brand/10 text-brand border-brand/20",
};

export default function Badge({ color = "zinc", children, dot = false }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${variants[color]}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${color === "green" ? "bg-green-400" : color === "red" ? "bg-red-400" : color === "yellow" ? "bg-yellow-400" : "bg-zinc-400"}`} />}
      {children}
    </span>
  );
}
