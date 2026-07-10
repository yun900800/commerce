import Link from "next/link";
import OrderStatusBadge from "./OrderStatusBadge";

interface Order {
  id: number;
  status: string;
  totalAmount: number;
  createdAt: string | null;
}

interface CustomerOrdersTableProps {
  orders: Order[];
}

export default function CustomerOrdersTable({ orders }: CustomerOrdersTableProps) {
  if (orders.length === 0) {
    return (
      <p className="text-sm text-gray-500 py-4">No orders yet.</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Order #
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Total
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Date
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Action
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {orders.map((order) => (
            <tr key={order.id}>
              <td className="px-4 py-3 text-sm font-medium text-gray-900">
                #{order.id}
              </td>
              <td className="px-4 py-3">
                <OrderStatusBadge status={order.status} />
              </td>
              <td className="px-4 py-3 text-sm text-gray-700 text-right">
                ${order.totalAmount.toFixed(2)}
              </td>
              <td className="px-4 py-3 text-sm text-gray-500 text-right">
                {order.createdAt
                  ? new Date(order.createdAt).toLocaleDateString()
                  : "-"}
              </td>
              <td className="px-4 py-3 text-right">
                <Link
                  href={`/orders/${order.id}`}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
