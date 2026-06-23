import { featureColumns } from "@/data/process";

export function FeatureColumns() {
  return (
    <div className="mt-16 grid gap-10 md:grid-cols-3">
      {featureColumns.map((col) => (
        <div key={col.title}>
          <h3 className="text-[15px] font-medium text-[#1a1a1a]">
            {col.title}
          </h3>
          <p className="mt-2 text-[14px] leading-relaxed text-[#666]">
            {col.description}
          </p>
        </div>
      ))}
    </div>
  );
}
