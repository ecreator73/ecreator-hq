import type { Metadata } from "next";
import { PlatformReport } from "@/components/marketing/platform-report";
import { rangeFrom, type SearchParams } from "../_shared";

export const metadata: Metadata = { title: "Meta Ads" };

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const { range } = await rangeFrom(searchParams);
  return <PlatformReport platform="meta_ads" range={range} />;
}
