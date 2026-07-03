import { AudioLines } from "lucide-react";
import { Link } from "react-router-dom";
export function Brand() {
  return <Link to="/" className="flex items-center gap-2 text-base font-semibold tracking-tight text-white"><AudioLines className="size-5 text-[#caff3d]" />Rehearsal</Link>;
}
