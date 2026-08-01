import { useMemo, useState } from "react";
import { ArrowRight, Layers3 } from "lucide-react";
import { Link } from "react-router-dom";
import type { Commodity, CommodityCategory } from "@/types";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { ErrorMessage } from "@/components/ErrorMessage";
import { FilterPanel } from "@/components/FilterPanel";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { SearchBar } from "@/components/SearchBar";
import { useApi } from "@/hooks/useApi";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { commodityApi } from "@/services/commodityApi";
import { formatDate } from "@/utils/formatters";

export function CommoditiesPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<CommodityCategory | "">("");
  const debouncedSearch = useDebouncedValue(search, 250);
  const result = useApi(
    () => commodityApi.list({ search: debouncedSearch, category, pageSize: 100 }),
    [debouncedSearch, category]
  );

  const columns = useMemo<DataTableColumn<Commodity>[]>(() => [
    {
      key: "commodity",
      header: "Commodity",
      render: (item) => (
        <div className="commodity-cell">
          <span className="commodity-swatch" style={{ background: item.color }} />
          <div><strong>{item.name}</strong><small>{item.symbol}</small></div>
        </div>
      )
    },
    { key: "category", header: "Category", render: (item) => <span className="category-badge">{item.category.toLowerCase()}</span> },
    { key: "unit", header: "Default unit", render: (item) => item.defaultUnit },
    { key: "updated", header: "Updated", render: (item) => formatDate(item.updatedAt) },
    {
      key: "view",
      header: "",
      align: "right",
      render: (item) => <Link to={`/commodities/${item.slug}`} className="table-link">View <ArrowRight size={14} /></Link>
    }
  ], []);

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Commodity library</p>
          <h2>Explore every configured crop</h2>
          <p>Search the catalog, open price history, and inspect state production rankings.</p>
        </div>
        <span className="heading-icon"><Layers3 size={22} /></span>
      </section>

      <section className="panel">
        <div className="toolbar">
          <SearchBar value={search} onChange={setSearch} placeholder="Search name, slug, or symbol" />
          <FilterPanel category={category} onCategoryChange={setCategory} />
        </div>
        {result.isLoading ? (
          <LoadingSpinner label="Loading commodities" />
        ) : result.error ? (
          <ErrorMessage message={result.error} onRetry={result.reload} />
        ) : (
          <DataTable
            items={result.data?.items ?? []}
            columns={columns}
            getRowKey={(item) => item.id}
            emptyTitle="No commodities match your filters"
          />
        )}
      </section>
    </div>
  );
}
