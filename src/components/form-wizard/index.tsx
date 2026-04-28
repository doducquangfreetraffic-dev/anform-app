'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Step1Basic from './steps/Step1Basic';
import Step2Sessions from './steps/Step2Sessions';
import Step3Database from './steps/Step3Database';
import Step4Branding from './steps/Step4Branding';
import Step5Settings from './steps/Step5Settings';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { DEFAULT_BRIEF, type FormBrief } from '@/types/form-brief';

const STEPS = [
  { num: 1, title: 'Cơ bản', component: Step1Basic },
  { num: 2, title: 'Buổi học', component: Step2Sessions },
  { num: 3, title: 'Học viên', component: Step3Database },
  { num: 4, title: 'Thương hiệu', component: Step4Branding },
  { num: 5, title: 'Cài đặt', component: Step5Settings },
];

export default function FormWizard({ initial }: { initial?: Partial<FormBrief> }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [brief, setBrief] = useState<FormBrief>({ ...DEFAULT_BRIEF, ...initial });

  function update(patch: Partial<FormBrief>) {
    setBrief((b) => ({ ...b, ...patch }));
  }

  function canAdvance(): boolean {
    if (step === 1) return brief.title.trim().length > 0;
    if (step === 2) return brief.sessions.length > 0;
    return true;
  }

  async function submit() {
    if (!brief.title.trim()) {
      toast.error('Cần điền tiêu đề');
      setStep(1);
      return;
    }
    setSubmitting(true);
    const res = await fetch('/api/forms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: brief.title, brief }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      toast.error(data.error || 'Tạo form thất bại');
      return;
    }
    toast.success('Đã tạo bản nháp 🌿');
    router.push(`/forms/${data.form.id}`);
  }

  const StepComp = STEPS[step - 1].component;
  const progress = (step / STEPS.length) * 100;

  return (
    <div className="max-w-3xl mx-auto p-8 space-y-8">
      <header className="space-y-3">
        <h1 className="text-3xl font-bold text-forest">Tạo form mới</h1>
        <Progress value={progress} className="h-2" />
        <div className="flex justify-between text-xs text-muted-brand">
          {STEPS.map((s) => (
            <span key={s.num} className={step >= s.num ? 'text-forest font-medium' : ''}>
              {s.num}. {s.title}
            </span>
          ))}
        </div>
      </header>

      <div className="bg-white rounded-2xl shadow-sm p-8 border border-soft-line min-h-[400px]">
        <StepComp brief={brief} update={update} />
      </div>

      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setStep(Math.max(1, step - 1))}
          disabled={step === 1}
          className="border-forest text-forest hover:bg-forest/10"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Quay lại
        </Button>

        {step < STEPS.length ? (
          <Button
            onClick={() => setStep(step + 1)}
            disabled={!canAdvance()}
            className="bg-forest hover:bg-forest-dark text-white"
          >
            Tiếp tục
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        ) : (
          <Button
            onClick={submit}
            disabled={submitting}
            className="bg-honey hover:bg-honey-light text-white"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {submitting ? 'Đang tạo…' : 'Tạo bản nháp'}
          </Button>
        )}
      </div>
    </div>
  );
}
