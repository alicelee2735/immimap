import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getUscisProcessingDataset } from "@/lib/uscis-data";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return {
    title: t("processingTitle"),
    description: t("processingDescription"),
  };
}

export default async function ProcessingTimesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Processing");
  const data = getUscisProcessingDataset();
  const lastUpdated = new Date(data.last_updated_iso);

  return (
    <main className="flex-1 px-4 py-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            {t("pageTitle")}
          </h1>
          <p className="max-w-3xl text-muted-foreground">{t("pageLead")}</p>
        </div>

        <Card className="border-border/80 shadow-sm">
          <CardHeader className="gap-1">
            <CardTitle className="text-lg">{t("tableCardTitle")}</CardTitle>
            <CardDescription>
              {t("lastUpdated")}:{" "}
              <time dateTime={data.last_updated_iso}>
                {lastUpdated.toLocaleString(locale === "zh" ? "zh-CN" : "en-US", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </time>
              {" · "}
              <span className="font-medium text-foreground">
                {t("sourceLine")}
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto px-0 sm:px-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">{t("columns.form")}</TableHead>
                  <TableHead>{t("columns.office")}</TableHead>
                  <TableHead className="text-right">
                    {t("columns.months")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.rows.map((row) => (
                  <TableRow key={`${row.form_type}-${row.office}`}>
                    <TableCell className="font-mono text-sm font-medium">
                      {row.form_type}
                    </TableCell>
                    <TableCell>{row.office}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.estimated_months}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <p className="text-sm leading-relaxed text-muted-foreground">
          {data.source_disclaimer} {t("disclaimer")}
        </p>
      </div>
    </main>
  );
}
