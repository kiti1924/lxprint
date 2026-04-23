import {
  createContext,
  useState,
  useEffect,
  // type Dispatch,
  // type SetStateAction,
} from "react";
import {
  Printer,
  type PrinterStatus,
  PrinterStatusEvent,
  PrinterErrorEvent,
} from "./lib/printer.ts";
import { connect } from "./lib/drivers.ts";

import { translations, type Language } from "./i18n.ts";

export type PrinterContextType = {
  printer?: Printer;
  // setPrinter: Dispatch<SetStateAction<Printer | undefined>>;
  printerStatus: PrinterStatus;
  // setPrinterStatus: Dispatch<SetStateAction<PrinterStatus | undefined>>;
  connect: (driver: string) => Promise<Printer>;
  errors: string[];
  browserKeepAlive: boolean;
  setBrowserKeepAlive: (val: boolean) => void;
  printerKeepAlive: boolean;
  setPrinterKeepAlive: (val: boolean) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof translations.en) => string;
};

export const PrinterContext = createContext<PrinterContextType>(
  {} as PrinterContextType,
);

export const PrinterContextProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [printerStatus, setPrinterStatus] = useState<PrinterStatus>({
    state: "disconnected",
  });
  const [printer, setPrinter] = useState<Printer>();
  const [errors, setErrors] = useState<string[]>([]);
  const [browserKeepAlive, setBrowserKeepAlive] = useState(() => localStorage.getItem("browser_keep_alive") === "true");
  const [printerKeepAlive, setPrinterKeepAlive] = useState(() => localStorage.getItem("printer_keep_alive") === "true");
  const [language, setLanguage] = useState<Language>(() => (localStorage.getItem("language") as Language) || "en");

  useEffect(() => {
    localStorage.setItem("language", language);
  }, [language]);

  const t = (key: keyof typeof translations.en): string => {
    return translations[language][key] || translations.en[key];
  };

  useEffect(() => {
    localStorage.setItem("browser_keep_alive", browserKeepAlive.toString());
  }, [browserKeepAlive]);

  useEffect(() => {
    localStorage.setItem("printer_keep_alive", printerKeepAlive.toString());
    if (printer) {
      printer.printerKeepAlive = printerKeepAlive;
    }
  }, [printerKeepAlive, printer]);

  // Screen Wake Lock API (Browser Keep-Alive)
  useEffect(() => {
    if (!browserKeepAlive) return;

    if (!('wakeLock' in navigator)) {
      setBrowserKeepAlive(false);
      return;
    }

    let wakeLock: any = null;
    const requestWakeLock = async () => {
      try {
        wakeLock = await (navigator as any).wakeLock.request('screen');
        console.log('Wake Lock is active');
      } catch (err: any) {
        console.error(`${err.name}, ${err.message}`);
        setBrowserKeepAlive(false);
      }
    };

    requestWakeLock();

    const handleVisibilityChange = () => {
      if (wakeLock !== null && document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLock) wakeLock.release();
    };
  }, [browserKeepAlive]);

  const connectPrinter = async (driver: string) => {
    setErrors([]);
    const prn: Printer = await connect(driver);
    prn.printerKeepAlive = printerKeepAlive;
    prn.addEventListener("status", (e) =>
      setPrinterStatus((e as PrinterStatusEvent<PrinterStatus>).status),
    );
    prn.addEventListener("error", (e) =>
      setErrors([...errors, (e as PrinterErrorEvent).msg]),
    );
    setPrinter(prn);
    return prn;
  };

  return (
    <PrinterContext
      value={{ 
        printer, 
        printerStatus, 
        errors, 
        connect: connectPrinter, 
        browserKeepAlive, 
        setBrowserKeepAlive, 
        printerKeepAlive, 
        setPrinterKeepAlive,
        language,
        setLanguage,
        t
      }}
    >
      {children}
    </PrinterContext>
  );
};
