import type { CommodityCategory } from "@/types";

interface FilterPanelProps {
  category: CommodityCategory | "";
  onCategoryChange: (category: CommodityCategory | "") => void;
}

export function FilterPanel({ category, onCategoryChange }: FilterPanelProps) {
  return (
    <label className="select-control">
      <span>Category</span>
      <select
        value={category}
        onChange={(event) => onCategoryChange(event.target.value as CommodityCategory | "")}
      >
        <option value="">All categories</option>
        <option value="GRAIN">Grain</option>
        <option value="OILSEED">Oilseed</option>
        <option value="FIBER">Fiber</option>
        <option value="SPECIALTY">Specialty</option>
        <option value="LIVESTOCK">Livestock &amp; raw products</option>
      </select>
    </label>
  );
}
