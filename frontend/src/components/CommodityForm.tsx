import { FormEvent, useEffect, useState } from "react";
import type { Commodity, CommodityCategory, CommodityInput } from "@/types";

interface CommodityFormProps {
  commodity?: Commodity | null;
  onSubmit: (input: CommodityInput) => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
}

const emptyForm: CommodityInput = {
  slug: "",
  name: "",
  symbol: "",
  category: "GRAIN",
  defaultUnit: "USD / bushel",
  color: "#2f7d32",
  description: ""
};

export function CommodityForm({ commodity, onSubmit, onCancel, isSaving }: CommodityFormProps) {
  const [form, setForm] = useState<CommodityInput>(emptyForm);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setForm(
      commodity
        ? {
            slug: commodity.slug,
            name: commodity.name,
            symbol: commodity.symbol,
            category: commodity.category,
            defaultUnit: commodity.defaultUnit,
            color: commodity.color,
            description: commodity.description ?? ""
          }
        : emptyForm
    );
    setError(null);
  }, [commodity]);

  function update<K extends keyof CommodityInput>(key: K, value: CommodityInput[K]): void {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!form.slug || !form.name || !form.symbol || !form.defaultUnit) {
      setError("Complete all required fields.");
      return;
    }
    setError(null);
    await onSubmit({
      ...form,
      slug: form.slug.toLowerCase().trim(),
      symbol: form.symbol.toUpperCase().trim()
    });
  }

  return (
    <form className="commodity-form" onSubmit={(event) => void submit(event)}>
      <div className="form-grid">
        <label>
          <span>Name</span>
          <input value={form.name} onChange={(event) => update("name", event.target.value)} required />
        </label>
        <label>
          <span>Slug</span>
          <input value={form.slug} onChange={(event) => update("slug", event.target.value)} placeholder="spring-wheat" required />
        </label>
        <label>
          <span>Symbol</span>
          <input value={form.symbol} onChange={(event) => update("symbol", event.target.value)} maxLength={12} required />
        </label>
        <label>
          <span>Category</span>
          <select value={form.category} onChange={(event) => update("category", event.target.value as CommodityCategory)}>
            <option value="GRAIN">Grain</option>
            <option value="OILSEED">Oilseed</option>
            <option value="FIBER">Fiber</option>
            <option value="SPECIALTY">Specialty</option>
            <option value="LIVESTOCK">Livestock &amp; raw products</option>
          </select>
        </label>
        <label>
          <span>Default unit</span>
          <input value={form.defaultUnit} onChange={(event) => update("defaultUnit", event.target.value)} required />
        </label>
        <label>
          <span>Map color</span>
          <div className="color-input-wrap">
            <input type="color" value={form.color} onChange={(event) => update("color", event.target.value)} />
            <input value={form.color} onChange={(event) => update("color", event.target.value)} pattern="#[0-9A-Fa-f]{6}" required />
          </div>
        </label>
      </div>
      <label>
        <span>Description</span>
        <textarea value={form.description ?? ""} onChange={(event) => update("description", event.target.value)} rows={3} />
      </label>
      {error && <p className="form-error">{error}</p>}
      <div className="form-actions">
        <button type="button" className="button button-ghost" onClick={onCancel}>Cancel</button>
        <button type="submit" className="button button-primary" disabled={isSaving}>
          {isSaving ? "Saving…" : commodity ? "Save changes" : "Create commodity"}
        </button>
      </div>
    </form>
  );
}
