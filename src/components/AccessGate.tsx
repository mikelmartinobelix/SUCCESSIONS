import React, { useState } from 'react';
import { Eye, EyeOff, Lock, XCircle } from 'lucide-react';

interface AccessGateProps {
  onUnlock: () => void;
}

const EXPECTED_HASH = '63f8c07e:7a19461a';

function hashAccessCode(input: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193);
    h2 = Math.imul(h2 ^ c, 0x85ebca6b);
  }
  return `${(h1 >>> 0).toString(16)}:${(h2 >>> 0).toString(16)}`;
}

export const AccessGate: React.FC<AccessGateProps> = ({ onUnlock }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = password.trim();
    if (!cleaned) {
      setError('Escriu la contrasenya per accedir-hi.');
      return;
    }
    if (hashAccessCode(cleaned) === EXPECTED_HASH) {
      setError('');
      onUnlock();
    } else {
      setError('Contrasenya incorrecta. Revisa les majúscules i torna-ho a provar.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 px-4 py-8">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xs">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Lock className="w-5 h-5" aria-hidden="true" />
          </div>
          <h1 className="font-display font-bold text-2xl tracking-tight text-slate-950 dark:text-white">
            Successions · 3r d’ESO
          </h1>
        </div>

        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
          Introdueix la contrasenya d’accés facilitada pel professorat per començar a practicar.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label
              htmlFor="access-password"
              className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5"
            >
              Contrasenya d’accés
            </label>
            <div className="relative">
              <input
                id="access-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError('');
                }}
                autoFocus
                autoComplete="off"
                placeholder="Escriu la contrasenya"
                className="w-full min-h-[44px] pl-4 pr-12 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:border-blue-600 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Oculta la contrasenya' : 'Mostra la contrasenya'}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <Eye className="w-4 h-4" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 text-sm font-medium text-red-700 dark:text-red-400"
            >
              <XCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            className="w-full min-h-[44px] px-5 py-2.5 text-sm font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
          >
            Accedir a la pràctica
          </button>
        </form>
      </div>
    </div>
  );
};
