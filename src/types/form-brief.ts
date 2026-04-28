// FormBrief — the structured input that drives AI HTML generation.

export interface SessionItem {
  id: string;
  title: string;
  date: string;     // ISO date (YYYY-MM-DD)
  time: string;     // free text e.g. "20:00 - 21:30"
  speaker?: string;
  location?: string;
  capacity?: number;
  description?: string;
}

export interface DatabaseEntry {
  email: string;
  name: string;
  klass?: string;   // course / class
  phone?: string;
  // arbitrary extra columns
  [key: string]: string | number | undefined;
}

export interface BrandingTheme {
  preset: 'angiao' | 'forest' | 'honey' | 'minimal' | 'custom';
  primary: string;       // hex
  secondary: string;     // hex
  background: string;    // hex
  fontFamily: string;    // e.g. "Be Vietnam Pro"
  bannerImage?: string;  // base64 data URL or http URL
  logo?: string;
}

export interface FormSettings {
  successHeadline: string;
  successMessage: string;
  redirectUrl?: string;
  collectPhone: boolean;
  collectEmail: boolean;
  requireCommitment: boolean;
  commitmentText?: string;
  multiSession: boolean;        // allow choosing multiple sessions
  duplicateCheck: 'email' | 'phone' | 'none';
}

export interface FormBrief {
  // Step 1: Basics
  title: string;
  subtitle?: string;
  description?: string;
  organizerName?: string;

  // Step 2: Sessions
  sessions: SessionItem[];

  // Step 3: Database (optional)
  database: DatabaseEntry[];

  // Step 4: Branding
  branding: BrandingTheme;

  // Step 5: Settings
  settings: FormSettings;
}

export const DEFAULT_BRIEF: FormBrief = {
  title: '',
  subtitle: '',
  description: '',
  organizerName: '',
  sessions: [],
  database: [],
  branding: {
    preset: 'angiao',
    primary: '#1F4D2C',
    secondary: '#A47E22',
    background: '#F5EFE0',
    fontFamily: 'Be Vietnam Pro',
  },
  settings: {
    successHeadline: 'Đã ghi nhận đăng ký 🌿',
    successMessage:
      'Cảm ơn bạn đã đăng ký. Bạn sẽ nhận được email xác nhận và link tham gia trước buổi học.',
    collectPhone: false,
    collectEmail: true,
    requireCommitment: true,
    commitmentText: 'Tôi cam kết sắp xếp tham gia đầy đủ buổi đã đăng ký',
    multiSession: true,
    duplicateCheck: 'email',
  },
};
