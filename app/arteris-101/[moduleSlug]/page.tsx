import { CurriculumModuleView } from "@/components/CurriculumModuleView";

export const dynamic = "force-dynamic";

export default async function Arteris101ModulePage({
  params,
  searchParams,
}: {
  params: Promise<{ moduleSlug: string }>;
  searchParams: Promise<{ level?: string }>;
}) {
  const { moduleSlug } = await params;
  const { level } = await searchParams;
  return <CurriculumModuleView track="arteris" moduleSlug={moduleSlug} levelParam={level} />;
}
