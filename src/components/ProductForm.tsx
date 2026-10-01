"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import Turnstile, { TurnstileHandle } from "@/components/Turnstile";

interface Category {
  id: number;
  name: string;
}

interface ProductFormData {
  name: string;
  slug: string;
  description: string;
  price: number;
  stock: number;
  imageUrl: string;
  categoryId: number | "";
}

interface ProductFormProps {
  categories: Category[];
  initialData?: ProductFormData & { id?: number };
}

export default function ProductForm({ categories, initialData }: ProductFormProps) {
  const router = useRouter();
  const isEditing = !!initialData?.id;
  // Turnstile guards product creation only; the edit form stays captcha-free so
  // the two flows never overlap on screen. POST is the only protected endpoint.
  const requiresTurnstile = !isEditing;
  const turnstileRef = useRef<TurnstileHandle>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<ProductFormData>(
    initialData ?? {
      name: "",
      slug: "",
      description: "",
      price: 0,
      stock: 0,
      imageUrl: "",
      categoryId: "",
    }
  );

  const isBlocked = requiresTurnstile && !turnstileToken;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (requiresTurnstile && !turnstileToken) {
      setError("Please complete the Turnstile verification first.");
      return;
    }

    const url = isEditing
      ? `/api/products?id=${initialData!.id}`
      : "/api/products";
    const method = isEditing ? "PUT" : "POST";

    setIsSubmitting(true);
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          price: Number(formData.price),
          stock: Number(formData.stock),
          categoryId: formData.categoryId || null,
          ...(requiresTurnstile ? { turnstileToken } : {}),
        }),
      });

      if (res.ok) {
        router.push("/products");
        router.refresh();
        return;
      }

      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Something went wrong. Please try again.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      // Turnstile tokens are single-use: this submission spent the current one,
      // so re-arm the widget whether it succeeded or failed.
      turnstileRef.current?.reset();
      setTurnstileToken(null);
      setIsSubmitting(false);
    }
  }

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Auto-generate slug from name
    if (name === "name" && !isEditing) {
      setFormData((prev) => ({
        ...prev,
        name: value,
        slug: value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
      }));
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Name
          </label>
          <input
            type="text"
            name="name"
            id="name"
            required
            value={formData.name}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="slug" className="block text-sm font-medium text-gray-700">
            Slug
          </label>
          <input
            type="text"
            name="slug"
            id="slug"
            required
            value={formData.slug}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            name="description"
            id="description"
            rows={3}
            value={formData.description}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="price" className="block text-sm font-medium text-gray-700">
            Price
          </label>
          <input
            type="number"
            name="price"
            id="price"
            required
            step="0.01"
            min="0"
            value={formData.price}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="stock" className="block text-sm font-medium text-gray-700">
            Stock
          </label>
          <input
            type="number"
            name="stock"
            id="stock"
            required
            min="0"
            value={formData.stock}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="categoryId" className="block text-sm font-medium text-gray-700">
            Category
          </label>
          <select
            name="categoryId"
            id="categoryId"
            value={formData.categoryId}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="">No category</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="imageUrl" className="block text-sm font-medium text-gray-700">
            Image URL
          </label>
          <input
            type="text"
            name="imageUrl"
            id="imageUrl"
            value={formData.imageUrl}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
      </div>

      {requiresTurnstile && (
        <div className="space-y-2">
          <Turnstile ref={turnstileRef} onTokenChange={setTurnstileToken} />
          <p className="text-xs text-gray-500">
            {turnstileToken
              ? "Verification complete."
              : "Verify you are human to enable the Create Product button."}
          </p>
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={isBlocked || isSubmitting}
          className="rounded-md bg-blue-600 px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400 disabled:hover:bg-gray-400"
        >
          {isSubmitting
            ? "Saving..."
            : isEditing
              ? "Update Product"
              : "Create Product"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-md bg-white px-6 py-2 text-sm font-semibold text-gray-700 border border-gray-300 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
