export function issueStatusDotClass(status: string) {
  if (status === "doing") return "bg-blue-500";
  if (status === "done") return "bg-emerald-500";
  return "bg-zinc-300";
}
