import { db } from "@/db";
import { customers, orders } from "@/db/schema";
import { eq, sql, desc, like } from "drizzle-orm";
import Link from "next/link";
import DeleteButton from "@/components/DeleteButton";

interface CustomersPageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function CustomersPage({ searchParams }: CustomersPageProps) {
  const { q } = await searchParams;

  const query = db
    .select({
      id: customers.id,
      name: customers.name,
      email: customers.email,
      phone: customers.phone,
      orderCount: sql<number>`count(${orders.id})`.mapWith(Number),
      totalSpent: sql<number>`coalesce(sum(${orders.totalAmount}), 0)`.mapWith(Number),
      createdAt: customers.createdAt,
    })
    .from(customers)
    .leftJoin(orders, eq(customers.id, orders.customerId));

  if (q) {
    query.where(
      sql`(${customers.name} like ${`%${q}%`} or ${customers.email} like ${`%${q}%`})`
    );
  }

  query
    .groupBy(customers.id)
    .orderBy(desc(customers.createdAt));

  const allCustomers = await query;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
        <Link
          href="/customers/new"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
        >
          + New Customer
        </Link>
      </div>

      <form className="mb-6">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Search by name or email..."
          className="block w-full max-w-sm rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
        />
      </form>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Phone
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Orders
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Total Spent
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {allCustomers.map((customer) => (
              <tr key={customer.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                  {customer.name}
                </td>
                <td className="px-6 py-4 text-sm text-gray-700">
                  {customer.email}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {customer.phone ?? "-"}
                </td>
                <td className="px-6 py-4 text-sm text-gray-700 text-right">
                  {customer.orderCount}
                </td>
                <td className="px-6 py-4 text-sm text-gray-700 text-right">
                  ${Number(customer.totalSpent).toFixed(2)}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-3">
                    <Link
                      href={`/customers/${customer.id}`}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      View
                    </Link>
                    {Number(customer.orderCount) === 0 && (
                      <DeleteButton id={customer.id} endpoint="/api/customers" />
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {allCustomers.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500">
                  No customers found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
