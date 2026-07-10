"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Customer {
  id: number;
  name: string;
  email: string;
}

interface Product {
  id: number;
  name: string;
  price: number;
  stock: number;
}

interface OrderItem {
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
}

export default function NewOrderPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [items, setItems] = useState<OrderItem[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [custRes, prodRes] = await Promise.all([
          fetch("/api/customers"),
          fetch("/api/products"),
        ]);
        const custData = await custRes.json();
        const prodData = await prodRes.json();
        setCustomers(custData);
        setProducts(prodData);
      } catch {
        setError("Failed to load data");
      }
    }
    loadData();
  }, []);

  function addItem() {
    setItems([...items, { productId: 0, productName: "", quantity: 1, unitPrice: 0 }]);
  }

  function removeItem(index: number) {
    setItems(items.filter((_, i) => i !== index));
  }

  function updateItem(index: number, field: keyof OrderItem, value: number | string) {
    const updated = [...items];
    if (field === "productId") {
      const product = products.find((p) => p.id === Number(value));
      updated[index] = {
        ...updated[index],
        productId: Number(value),
        productName: product?.name ?? "",
        unitPrice: product?.price ?? 0,
      };
    } else if (field === "quantity") {
      updated[index] = { ...updated[index], quantity: Number(value) };
    }
    setItems(updated);
  }

  function getTotal(): number {
    return items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  }

  const availableProducts = products.filter((p) => Number(p.stock) > 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!customerId) {
      setError("Please select a customer.");
      return;
    }

    if (items.length === 0 || items.some((item) => !item.productId)) {
      setError("Please add at least one product.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: Number(customerId),
          items: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create order");
        setLoading(false);
        return;
      }

      router.push(`/orders/${data.id}`);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/orders"
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          &larr; Back
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">New Order</h1>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer Select */}
          <div>
            <label htmlFor="customer" className="block text-sm font-medium text-gray-700">
              Customer <span className="text-red-500">*</span>
            </label>
            <select
              id="customer"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">Select a customer...</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.email})
                </option>
              ))}
            </select>
          </div>

          {/* Order Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Order Items <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={addItem}
                className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
              >
                + Add Item
              </button>
            </div>

            {items.length === 0 && (
              <p className="text-sm text-gray-400 italic">No items added yet.</p>
            )}

            <div className="space-y-3">
              {items.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-md border border-gray-200"
                >
                  <div className="flex-1">
                    <select
                      value={item.productId}
                      onChange={(e) => updateItem(index, "productId", e.target.value)}
                      className="block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="">Select product...</option>
                      {availableProducts.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} — ${Number(p.price).toFixed(2)} ({p.stock} in stock)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-24">
                    <input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => updateItem(index, "quantity", e.target.value)}
                      className="block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <div className="w-24 text-right text-sm text-gray-700">
                    ${(item.unitPrice * item.quantity).toFixed(2)}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="text-sm text-red-600 hover:text-red-800 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Total */}
          {items.length > 0 && (
            <div className="flex justify-end border-t pt-4">
              <div className="text-right">
                <span className="text-sm text-gray-500">Total: </span>
                <span className="text-lg font-bold text-gray-900">
                  ${getTotal().toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={loading}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Creating..." : "Create Order"}
            </button>
            <Link
              href="/orders"
              className="text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
