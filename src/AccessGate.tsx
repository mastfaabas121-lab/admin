import { FormEvent, ReactNode, useState } from "react";
import { KeyRound, LogIn } from "lucide-react";

const ACCESS_CODE = "1001";

export default function AccessGate({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (code === ACCESS_CODE) {
      setUnlocked(true);
      setCode("");
      setError("");
      return;
    }
    setCode("");
    setError("رمز الدخول غير صحيح.");
  };

  if (unlocked) return children;

  return <main className="access-gate" dir="rtl">
    <form className="access-card" onSubmit={submit}>
      <img className="access-logo" src={`${import.meta.env.BASE_URL}app-logo.png`} alt="البيت الأبيض للأثاث" />
      <span className="access-lock"><KeyRound size={24} /></span>
      <h1>الدخول إلى النظام</h1>
      <p>أدخل رمز الدخول للمتابعة</p>
      <label className="access-code-field">
        <span>رمز الدخول</span>
        <input autoFocus type="password" inputMode="numeric" autoComplete="off" value={code} onChange={(event) => { setCode(event.target.value.replace(/\D/g, "")); setError(""); }} aria-label="رمز الدخول" />
      </label>
      {error && <div className="access-error" role="alert">{error}</div>}
      <button type="submit" className="access-submit"><LogIn size={19} /> دخول</button>
    </form>
  </main>;
}
