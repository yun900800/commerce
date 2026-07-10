interface OrderItem {
  id: number;
  quantity: number;
  unitPrice: number;
  productId: number;
  product: {
    id: number;
    name: string;
  } | null;
}

interface OrderItemsTableProps {
  items: OrderItem[];
}

export default function OrderItemsTable({ items }: OrderItemsTableProps) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-gray-500 py-4">No items in this order.</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Product
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Qty
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Unit Price
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Subtotal
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {items.map((item) => (
            <tr key={item.id}>
              <td className="px-4 py-3 text-sm text-gray-900">
                {item.product?.name ?? `Product #${item.productId}`}
              </td>
              <td className="px-4 py-3 text-sm text-gray-700 text-right">
                {item.quantity}
              </td>
              <td className="px-4 py-3 text-sm text-gray-700 text-right">
                ${item.unitPrice.toFixed(2)}
              </td>
              <td className="px-4 py-3 text-sm text-gray-900 font-medium text-right">
                ${(item.quantity * item.unitPrice).toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
