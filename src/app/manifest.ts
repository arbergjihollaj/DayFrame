import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "DayFrame",
    short_name: "DayFrame",
    description: "Privates Daily-Dashboard fuer Arber",
    start_url: "/",
    display: "standalone",
    background_color: "#0c111d",
    theme_color: "#0c111d",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
