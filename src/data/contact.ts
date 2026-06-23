export const contactSection = {
  eyebrow: "Contact",
  title: "OPEN A CHANNEL",
  subtitle: "Pick a line — phone, mail, or social. All routes lead to the same builder.",
  footer: "Based in NJ · Open to internships and collabs",
};

export type ContactChannel = {
  id: string;
  label: string;
  value: string;
  href: string;
  icon: "phone" | "email" | "linkedin" | "instagram";
  action: string;
  theme: {
    hoverBorder: string;
    hoverShadow: string;
    activeBorder: string;
    activeShadow: string;
    iconBox: string;
    label: string;
    action: string;
  };
};

export const contactChannels: ContactChannel[] = [
  {
    id: "phone",
    label: "PHONE",
    value: "(516) 836-5309",
    href: "tel:+15168365309",
    icon: "phone",
    action: "CALL",
    theme: {
      hoverBorder: "hover:border-emerald-400",
      hoverShadow: "hover:shadow-[4px_4px_0_#34d399]",
      activeBorder: "border-emerald-400",
      activeShadow: "shadow-[4px_4px_0_#34d399]",
      iconBox:
        "border-emerald-500/40 bg-emerald-500/15 text-emerald-400 group-hover:border-emerald-400 group-hover:bg-emerald-500/20",
      label: "text-emerald-400/90",
      action:
        "group-hover:border-emerald-400 group-hover:bg-emerald-400/15 group-hover:text-emerald-300",
    },
  },
  {
    id: "email",
    label: "MAIL",
    value: "sudhev1881@gmail.com",
    href: "mailto:sudhev1881@gmail.com",
    icon: "email",
    action: "SEND",
    theme: {
      hoverBorder: "hover:border-red-400",
      hoverShadow: "hover:shadow-[4px_4px_0_#f87171]",
      activeBorder: "border-red-400",
      activeShadow: "shadow-[4px_4px_0_#f87171]",
      iconBox:
        "border-red-500/35 bg-red-500/15 text-red-400 group-hover:border-red-400 group-hover:bg-red-500/20",
      label: "text-red-400/90",
      action:
        "group-hover:border-red-400 group-hover:bg-red-400/15 group-hover:text-red-300",
    },
  },
  {
    id: "linkedin",
    label: "LINKEDIN",
    value: "sudhev-mathew-abi",
    href: "https://www.linkedin.com/in/sudhev-mathew-abi-011380336",
    icon: "linkedin",
    action: "VISIT",
    theme: {
      hoverBorder: "hover:border-[#0A66C2]",
      hoverShadow: "hover:shadow-[4px_4px_0_#0A66C2]",
      activeBorder: "border-[#0A66C2]",
      activeShadow: "shadow-[4px_4px_0_#0A66C2]",
      iconBox:
        "border-[#0A66C2]/40 bg-[#0A66C2]/15 text-[#60a5fa] group-hover:border-[#0A66C2] group-hover:bg-[#0A66C2]/20",
      label: "text-[#60a5fa]/90",
      action:
        "group-hover:border-[#0A66C2] group-hover:bg-[#0A66C2]/15 group-hover:text-[#93c5fd]",
    },
  },
  {
    id: "instagram",
    label: "INSTAGRAM",
    value: "@sudhevmathew.abi",
    href: "https://www.instagram.com/sudhevmathew.abi/",
    icon: "instagram",
    action: "FOLLOW",
    theme: {
      hoverBorder: "hover:border-pink-500",
      hoverShadow: "hover:shadow-[4px_4px_0_#ec4899]",
      activeBorder: "border-pink-500",
      activeShadow: "shadow-[4px_4px_0_#ec4899]",
      iconBox:
        "border-pink-500/40 bg-pink-500/15 text-pink-400 group-hover:border-pink-400 group-hover:bg-pink-500/20",
      label: "text-pink-400/90",
      action:
        "group-hover:border-pink-500 group-hover:bg-pink-500/15 group-hover:text-pink-300",
    },
  },
];
