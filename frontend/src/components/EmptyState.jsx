import { Images, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

export default function EmptyState({
  title = "No memories yet",

  description = "Every beautiful album starts with the first photo.",

  action = true,
}) {
  return (
    <div
      className="
mx-auto
my-16
max-w-lg
rounded-[2rem]
bg-white
px-6
py-14
text-center
shadow-md
border
border-gray-100
"
    >
      {/* ICON */}

      <div
        className="
mx-auto
mb-6
grid
h-20
w-20
place-items-center
rounded-full
bg-gradient-to-br
from-orange-100
to-pink-100
text-orange-500
"
      >
        <Images size={34} />
      </div>

      {/* TEXT */}

      <div
        className="
mb-3
flex
items-center
justify-center
gap-2
text-orange-500
text-sm
font-semibold
"
      >
        <Sparkles size={15} />
        Memory book
      </div>

      <h3
        className="
font-display
text-2xl
font-bold
text-gray-900
"
      >
        {title}
      </h3>

      <p
        className="
mx-auto
mt-3
max-w-sm
leading-7
text-gray-500
"
      >
        {description}
      </p>

      {/* ACTION */}

      {action && (
        <Link
          to="/upload"
          className="
mt-8
inline-flex
items-center
justify-center
rounded-full
bg-orange-500
px-7
py-3
font-semibold
text-white
shadow-md
hover:scale-105
transition
"
        >
          Add first memory
        </Link>
      )}
    </div>
  );
}
