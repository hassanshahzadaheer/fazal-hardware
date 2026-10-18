import { useState, FormEvent } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { Button, Field, Input } from '../../components/ui';

export default function LoginPage() {
  const { login, error } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await login(email, password);
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-shell font-sans">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-surface p-8 rounded-lg shadow-lg border border-border"
      >
        <div className="flex items-center gap-2 mb-6">
          <div className="w-9 h-9 rounded-md bg-accent flex items-center justify-center text-white font-bold text-lg">
            F
          </div>
          <span className="font-bold text-lg text-ink">Fazal Hardware</span>
        </div>

        {error && (
          <div className="mb-4 text-sm text-danger bg-danger-soft border border-danger/20 rounded-md px-3 py-2">
            {error}
          </div>
        )}

        <Field label="Email">
          <Input
            id="email"
            type="email"
            required
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@fazalhardware.local"
          />
        </Field>

        <div className="h-4" />

        <Field label="Password">
          <Input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>

        <div className="h-6" />

        <Button type="submit" variant="primary" loading={submitting} className="w-full">
          Sign In
        </Button>
      </form>
    </div>
  );
}
