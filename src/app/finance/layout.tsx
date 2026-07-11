export default function FinanceLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          📄 SEC 文件查询
        </h1>
        <p className="text-sm text-gray-500">
          查询美国上市公司向 SEC 提交的各类申报文件，包括年报、季报、重大事件、内部人交易等。
        </p>
      </div>

      {/* Page content */}
      {children}
    </div>
  );
}
