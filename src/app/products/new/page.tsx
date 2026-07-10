import { db } from "@/db";
import { categories } from "@/db/schema";
import ProductForm from "@/components/ProductForm";

export default async function NewProductPage() {
  const allCategories = await db.select().from(categories);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">New Product</h1>
      <ProductForm categories={allCategories} />
    </div>
  );
}
