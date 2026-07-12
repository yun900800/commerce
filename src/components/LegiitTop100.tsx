import type { LegiitServiceDisplay } from "@/types/legiit";

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

function PriceTag({ price }: { price: number | null }) {
  if (price == null) return <span className="text-gray-400">-</span>;
  return <span className="font-medium text-gray-900">${price}</span>;
}

function LevelBadge({ level }: { level: string }) {
  if (!level || level === "Unranked") return null;
  const colors: Record<string, string> = {
    "Level 1": "bg-gray-100 text-gray-700",
    "Level 2": "bg-blue-100 text-blue-700",
    "Level 3": "bg-green-100 text-green-700",
    "Level 4": "bg-purple-100 text-purple-700",
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${colors[level] || "bg-gray-100 text-gray-600"}`}>
      {level}
    </span>
  );
}

export default function LegiitTop100({ services }: { services: LegiitServiceDisplay[] }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-12">#</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Seller</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Price</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Rating</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Reviews</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {services.map((svc) => (
              <tr key={`${svc.username}-${svc.seoUrl}`} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-sm">
                  <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                    svc.rank <= 3
                      ? svc.rank === 1
                        ? "bg-yellow-100 text-yellow-800"
                        : svc.rank === 2
                        ? "bg-gray-200 text-gray-700"
                        : "bg-orange-100 text-orange-700"
                      : "bg-gray-50 text-gray-500"
                  }`}>
                    {svc.rank}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <a
                    href={svc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-gray-900 hover:text-blue-600 line-clamp-2 block max-w-xs"
                    title={svc.title}
                  >
                    {svc.title}
                  </a>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm text-gray-700">{svc.username}</span>
                    <LevelBadge level={svc.sellerLevel} />
                  </div>
                </td>
                <td className="px-4 py-3 text-right text-sm">
                  <PriceTag price={svc.basicPrice} />
                </td>
                <td className="px-4 py-3 text-center">
                  <StarRating rating={svc.rating} />
                </td>
                <td className="px-4 py-3 text-right text-sm">
                  <span className="font-semibold text-gray-900">
                    {svc.reviewCount?.toLocaleString() ?? "-"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col">
                    <span className="text-sm text-gray-700">{svc.category}</span>
                    {svc.subcategory && (
                      <span className="text-xs text-gray-400">{svc.subcategory}</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
