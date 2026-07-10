import { db } from "@/db";
import { orders, customers } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import Link from "next/link";
import OrderStatusBadge from "@/components/OrderStatusBadge";
import DeleteButton from "@/components/DeleteButton";

interface OrdersPageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  const { status } = await searchParams;

  const query = db
    .select({
      id: orders.id,
      status: orders.status,
      totalAmount: orders.totalAmount,
      createdAt: orders.createdAt,
      customerName: customers.name,
    })
    .from(orders)
    .leftJoin(customers, eq(orders.customerId, customers.id));

  if (status && ["pending", "confirmed", "shipped", "delivered", "cancelled"].includes(status)) {
    query.where(eq(orders.status, status));
  }

  query.orderBy(desc(orders.createdAt));

  const allOrders = await query;

  const statuses = ["", "pending", "confirmed", "shipped", "delivered", "cancelled"];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
        <Link
          href="/orders/new"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
        >
          + New Order
        </Link>
      </div>

      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {statuses.map((s) => (
          <Link
            key={s}
            href={s ? `/orders?status=${s}` : "/orders"}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              (status ?? "") === s
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {s === "" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Order #
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Customer
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Total
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Date
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {allOrders.map((order) => (
              <tr key={order.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                  #{order.id}
                </td>
                <td className="px-6 py-4 text-sm text-gray-700">
                  {order.customerName ?? "Unknown"}
                </td>
                <td className="px-6 py-4">
                  <OrderStatusBadge status={order.status} />
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 text-right">
                  ${Number(order.totalAmount).toFixed(2)}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 text-right">
                  {order.createdAt
                    ? new Date(order.createdAt).toLocaleDateString()
                    : "-"}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-3">
                    <Link
                      href={`/orders/${order.id}`}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      View
                    </Link>
                    <DeleteButton id={order.id} endpoint="/api/orders" />
                  </div>
                </td>
              </tr>
            ))}
            {allOrders.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500">
                  No orders found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
