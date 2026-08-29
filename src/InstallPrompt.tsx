import { useEffect, useRef, useState } from "react";
import { Download, Share2, X } from "lucide-react";

type InstallChoice = { outcome: "accepted" | "dismissed" };
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<InstallChoice>;
}

function isStandalone() {
  const iosNavigator = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || iosNavigator.standalone === true;
}

export default function InstallPrompt() {
  const [open, setOpen] = useState(() => !isStandalone());
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [instructions, setInstructions] = useState("");
  const skipped = useRef(false);

  useEffect(() => {
    const capturePrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
      if (!skipped.current) setOpen(true);
    };
    const installed = () => setOpen(false);
    window.addEventListener("beforeinstallprompt", capturePrompt);
    window.addEventListener("appinstalled", installed);
    return () => {
      window.removeEventListener("beforeinstallprompt", capturePrompt);
      window.removeEventListener("appinstalled", installed);
    };
  }, []);

  const install = async () => {
    if (installEvent) {
      await installEvent.prompt();
      const choice = await installEvent.userChoice;
      setInstallEvent(null);
      if (choice.outcome === "accepted") setOpen(false);
      return;
    }
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setInstructions(isIos
      ? "اضغط زر المشاركة في المتصفح، ثم اختر «إضافة إلى الشاشة الرئيسية»."
      : "افتح قائمة المتصفح واختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية»."
    );
  };

  const skip = () => {
    skipped.current = true;
    setOpen(false);
  };

  if (!open) return null;

  return <div className="install-overlay" role="dialog" aria-modal="true" aria-labelledby="install-title" dir="rtl">
    <section className="install-card">
      <button type="button" className="install-close" onClick={skip} aria-label="تخطي التثبيت"><X size={20} /></button>
      <img src={`${import.meta.env.BASE_URL}app-logo.png`} alt="شعار البيت الأبيض للأثاث" />
      <div className="install-copy">
        <span><Download size={18} /> تطبيق ويب</span>
        <h2 id="install-title">ثبّت النظام على جهازك</h2>
        <p>افتح النظام بسرعة من الشاشة الرئيسية واستخدمه بشكل تطبيق مستقل.</p>
      </div>
      {instructions && <div className="install-instructions"><Share2 size={18} />{instructions}</div>}
      <div className="install-actions">
        <button type="button" className="install-primary" onClick={() => void install()}><Download size={19} /> تثبيت التطبيق</button>
        <button type="button" className="install-skip" onClick={skip}>تخطي الآن</button>
      </div>
    </section>
  </div>;
}
