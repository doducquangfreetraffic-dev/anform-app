import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function AccessDeniedPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-8 bg-paper">
      <div className="max-w-md text-center space-y-6 bg-white rounded-2xl shadow-lg p-10 border border-soft-line">
        <div className="text-6xl">🚫</div>
        <h1 className="text-3xl font-bold text-forest">Chưa có quyền truy cập</h1>
        <p className="text-muted-brand">
          Email của bạn không nằm trong danh sách thành viên HB Compro.
          Liên hệ An Giáo để được cấp quyền.
        </p>
        <Link href="/login">
          <Button variant="outline" className="border-forest text-forest hover:bg-forest hover:text-white">
            Quay lại đăng nhập
          </Button>
        </Link>
      </div>
    </main>
  );
}
