import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center p-8 bg-paper">
      <div className="max-w-2xl text-center space-y-8">
        <h1 className="text-6xl font-bold text-forest">ANFORM</h1>
        <p className="text-2xl text-honey italic">Tạo form đẹp như nói chuyện</p>
        <p className="text-muted-brand">5 phút. 1 form đẹp. Trên domain riêng.</p>
        <Link
          href="/login"
          className="inline-block px-8 py-4 bg-forest text-white rounded-lg hover:bg-forest-dark transition font-medium"
        >
          Đăng nhập
        </Link>
      </div>
    </main>
  );
}
