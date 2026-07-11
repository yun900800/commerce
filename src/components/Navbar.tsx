import Link from "next/link";
import { cookies } from "next/headers";
import MobileMenu from "@/components/MobileMenu";

async function getSessionUser(): Promise<{ name: string } | null> {
  // This runs on the server — we read the cookie directly.
  // The cookie is a base64 JSON blob set by the login API.
  try {
    const store = await cookies();
    const raw = store.get("session")?.value;
    if (!raw) return null;
    return JSON.parse(Buffer.from(raw, "base64").toString("utf-8"));
  } catch {
    return null;
  }
}

export default async function Navbar() {
  const user = await getSessionUser();

  return (
    <nav className="bg-white border-b border-gray-200 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-xl font-bold text-gray-900">
              Commerce
            </Link>
            <div className="hidden sm:flex items-center gap-6">
              <Link
                href="/orders"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Orders
              </Link>
              <Link
                href="/products"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Products
              </Link>
              <Link
                href="/customers"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Customers
              </Link>
              <Link
                href="/users"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Users
              </Link>
              <Link
                href="/finance"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                💰 金融
              </Link>
            </div>
          </div>

          {/* Desktop auth */}
          <div className="hidden sm:flex items-center gap-4">
            {user ? (
              <>
                <span className="text-sm text-gray-500">
                  {user.name}
                </span>
                <a
                  href="/api/auth/logout"
                  className="text-sm font-medium text-red-600 hover:text-red-800 transition-colors"
                >
                  Sign Out
                </a>
              </>
            ) : (
              <Link
                href="/auth"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Sign In
              </Link>
            )}
          </div>

          {/* Mobile hamburger */}
          <div className="flex sm:hidden items-center">
            <MobileMenu user={user} />
          </div>
        </div>
      </div>
    </nav>
  );
}
