import { Link } from "react-router-dom";
import logoImg from "../assets/logo.png";

export function Logo({
  className = "h-10",
  linkTo = "/",
}: {
  className?: string;
  linkTo?: string | null;
}) {
  const mark = (
    <div
      className={`overflow-hidden rounded-sm ${className}`}
      style={{ aspectRatio: "1250 / 560" }}
    >
      <img
        src={logoImg}
        alt="LiberaGo"
        className="h-full w-full object-cover"
        style={{ objectPosition: "50% 47%" }}
      />
    </div>
  );

  if (!linkTo) return mark;

  return (
    <Link
      to={linkTo}
      className="inline-flex items-center rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
      aria-label="LiberaGo"
    >
      {mark}
    </Link>
  );
}
