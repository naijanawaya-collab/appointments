import { permanentRedirect } from "next/navigation";

/** Old URL (Phase 1): /book/<slug> → /<slug>/book. Kept so shared links keep working. */
export default async function LegacyBookRedirect(props: PageProps<"/book/[slug]">) {
  const { slug } = await props.params;
  permanentRedirect(`/${encodeURIComponent(slug)}/book`);
}
