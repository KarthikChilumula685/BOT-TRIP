import useProfilePhoto from "../hooks/useProfilePhoto";

export default function Avatar({ user, size = "md", className = "" }) {
  const sizes = {
    sm: "h-8 w-8 text-xs",

    md: "h-11 w-11 text-sm",

    lg: "h-20 w-20 text-xl",

    xl: "h-28 w-28 text-3xl",
  };

  const { url } = useProfilePhoto(user?._id);

  if (user?.profilePhotoId && url) {
    return (
      <img
        src={url}
        alt={user.name}
        className={`
        
        ${sizes[size]}

        rounded-full

        object-cover

        shadow-md

        ring-4

        ring-white

        ${className}

        `}
      />
    );
  }

  return (
    <div
      className={`

      ${sizes[size]}

      grid

      shrink-0

      place-items-center

      rounded-full

      bg-gradient-to-br

      from-orange-300

      via-pink-300

      to-rose-400

      font-display

      font-bold

      text-white

      shadow-md

      ring-4

      ring-white

      ${className}

      `}
    >
      {user?.name?.charAt(0)?.toUpperCase() || "T"}
    </div>
  );
}
