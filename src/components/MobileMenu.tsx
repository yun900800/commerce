"use client";

import { useState } from "react";
import Link from "next/link";

interface MobileMenuProps {
  user: { name: string } | null;
}

const navLinks = [
  { href: "/orders", label: "Orders" },
  { href: "/products", label: "Products" },
  { href: "/customers", label: "Customers" },
  { href: "/users", label: "Users" },
  { href: "/finance", label: "💰 金融" },
  { href: "/legiit", label: "⚡ Legiit" },
  { href: "/kwork", label: "🔧 Kwork" },
];

export default function MobileMenu({ user }: MobileMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="sm:hidden">
      {/* Hamburger button */}
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center justify-center p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        aria-label="Toggle menu"
      >
        {open ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>

      {/* Dropdown menu */}
      {open && (
        <div className="absolute left-0 right-0 top-16 z-50 bg-white border-b border-gray-200 shadow-lg">
          <div className="px-4 py-3 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="block px-3 py-2.5 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
              >
                {link.label}
              </Link>
            ))}

            {/* Divider */}
            <div className="border-t border-gray-100 my-2" />

            {/* User info & auth */}
            {user ? (
              <div className="px-3 py-2">
                <span className="block text-sm text-gray-500 mb-2">{user.name}</span>
                <a
                  href="/api/auth/logout"
                  onClick={() => setOpen(false)}
                  className="block text-sm font-medium text-red-600 hover:text-red-800 transition-colors"
                >
                  Sign Out
                </a>
              </div>
            ) : (
              <Link
                href="/auth"
                onClick={() => setOpen(false)}
                className="block px-3 py-2.5 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
