import { db } from "@/db";
import { customers, orders } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import CustomerOrdersTable from "@/components/CustomerOrdersTable";
import DeleteButton from "@/components/DeleteButton";

interface CustomerDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function CustomerDetailPage({ params }: CustomerDetailPageProps) {
  const { id } = await params;
  const customerId = Number(id);

  const customer = await db
    .select()
    .from(customers)
    .where(eq(customers.id, customerId))
    .get();

  if (!customer) {
    notFound();
  }

  const customerOrders = await db
    .select({
      id: orders.id,
      status: orders.status,
      totalAmount: orders.totalAmount,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .where(eq(orders.customerId, customerId))
    .orderBy(desc(orders.createdAt));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link
            href="/customers"
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            &larr; Back
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{customer.name}</h1>
        </div>
        <DeleteButton id={customer.id} endpoint="/api/customers" redirectTo="/customers" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Contact Info
            </h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-xs text-gray-500">Email</dt>
                <dd className="text-sm text-gray-900">{customer.email}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Phone</dt>
                <dd className="text-sm text-gray-900">{customer.phone ?? "-"}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Address</dt>
                <dd className="text-sm text-gray-900">
                  {customer.address ?? "-"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Customer since</dt>
                <dd className="text-sm text-gray-900">
                  {customer.createdAt
                    ? new Date(customer.createdAt).toLocaleDateString()
                    : "-"}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Order History
              </h2>
            </div>
            <CustomerOrdersTable orders={customerOrders} />
          </div>
        </div>
      </div>
    </div>
  );
}
