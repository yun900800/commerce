import type { KworkProjectDisplay } from "@/types/kwork";

function formatPrice(price: number | null): string {
  if (price == null) return "-";
  if (price >= 1000) {
    return `${(price / 1000).toFixed(price % 1000 === 0 ? 0 : 1)}K`;
  }
  return String(price);
}

function StarRating({ rating }: { rating: number | null }) {
  if (rating == null) return <span className="text-gray-400">-</span>;
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  const stars = "★".repeat(full) + (half ? "½" : "");
  return (
    <span className="text-yellow-500 text-sm" title={rating.toFixed(2)}>
      {stars}
      <span className="text-gray-400 text-xs ml-1">{rating.toFixed(2)}</span>
    </span>
  );
}

export default function KworkTop100({
  projects,
}: {
  projects: KworkProjectDisplay[];
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-12">
                #
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Service
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Seller
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Price
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                Rating
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Reviews
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Favorites
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Category
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {projects.map((p) => (
              <tr
                key={p.id ?? `${p.sellerUsername}-${p.rank}`}
                className="hover:bg-gray-50 transition-colors"
              >
                <td className="px-4 py-3 text-sm">
                  <span
                    className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                      p.rank <= 3
                        ? p.rank === 1
                          ? "bg-yellow-100 text-yellow-800"
                          : p.rank === 2
                          ? "bg-gray-200 text-gray-700"
                          : "bg-orange-100 text-orange-700"
                        : "bg-gray-50 text-gray-500"
                    }`}
                  >
                    {p.rank}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-gray-900 hover:text-blue-600 line-clamp-2 block max-w-xs"
                    title={p.title}
                  >
                    {p.title}
                  </a>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm text-gray-700">
                      {p.sellerUsername}
                    </span>
                    {p.sellerFullname && (
                      <span className="text-xs text-gray-400">
                        {p.sellerFullname}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                  {p.price != null ? `${formatPrice(p.price)} ₽` : "-"}
                </td>
                <td className="px-4 py-3 text-center">
                  <StarRating rating={p.sellerRating} />
                </td>
                <td className="px-4 py-3 text-right text-sm">
                  <span className="font-semibold text-gray-900">
                    {p.sellerReviewsCount?.toLocaleString() ?? "-"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-sm text-gray-600">
                  {p.favoritesCount?.toLocaleString() ?? "-"}
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-gray-700">{p.category}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
