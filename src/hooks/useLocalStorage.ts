import { useState, useEffect } from "react";

export function useLocalStorage<T>(key: string, initialValue: T | (() => T)): [T, React.Dispatch<React.SetStateAction<T>>] {
  // Read from localStorage on initial render
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item !== null) {
        // Since we are storing strings for simplicity in the original code,
        // we might have to handle type conversions carefully. 
        // The original code uses string 'true' / 'false' and raw strings.
        // Let's implement a JSON.parse version which is safer and standard,
        // but since old data might not be JSON, we need a fallback.
        
        try {
          return JSON.parse(item);
        } catch {
          // If it's not valid JSON, it's likely a raw string from previous versions
          if (item === "true") return true as any;
          if (item === "false") return false as any;
          
          // Try to parse as number if it looks like one, but only if T expects a number
          // For safety, we will just return the raw string if it's not JSON and doesn't match boolean, 
          // and let the caller handle parsing if needed, OR we can try to guess.
          // Better: simply check if initialValue is a number.
          
          const isNumber = typeof (initialValue instanceof Function ? initialValue() : initialValue) === 'number';
          if (isNumber) {
            const num = Number(item);
            if (!isNaN(num)) return num as any;
          }
          
          return item as any;
        }
      }
      return initialValue instanceof Function ? initialValue() : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue instanceof Function ? initialValue() : initialValue;
    }
  });

  // Write to localStorage whenever the value changes
  useEffect(() => {
    try {
      // Stringify only if it's an object or we strictly want JSON. 
      // To maintain backwards compatibility with existing localStorage data in this app:
      let valueToStore: string;
      if (typeof storedValue === 'string') {
        valueToStore = storedValue;
      } else {
        valueToStore = JSON.stringify(storedValue);
      }
      window.localStorage.setItem(key, valueToStore);
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
}
