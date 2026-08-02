import { getTranslations } from "next-intl/server";

import { cn } from "@/lib/utils";

type Props = {
  locale: string;
  formTypes: string[];
  selectedForm: string | null;
};

function processingPagePath(locale: string) {
  return locale === "en" ? "/processing" : `/${locale}/processing`;
}

export async function ProcessingFormFilters({
  locale,
  formTypes,
  selectedForm,
}: Props) {
  const t = await getTranslations("Processing");
  const processingPath = processingPagePath(locale);

  return (
    <div className="sticky top-[80px] z-30 border-b border-slate-200 bg-white/95 backdrop-blur-md">
      <form method="get" action={processingPath} className="flex overflow-x-auto">
        <button
          type="submit"
          className={cn(
            "shrink-0 border-b-2 px-4 py-3 text-sm font-medium transition-colors",
            !selectedForm
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-900",
          )}
        >
          {t("allForms")}
        </button>
        {formTypes.map((form) => (
          <button
            key={form}
            type="submit"
            {...(selectedForm === form
              ? { formAction: processingPath }
              : { name: "form", value: form })}
            className={cn(
              "shrink-0 border-b-2 px-4 py-3 font-mono text-sm font-medium transition-colors",
              selectedForm === form
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-900",
            )}
          >
            {form}
          </button>
        ))}
      </form>
    </div>
  );
}
