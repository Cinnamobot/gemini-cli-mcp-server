import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Get the directory where this module is located
const __dirname = dirname(fileURLToPath(import.meta.url));

// Supported languages
export type SupportedLanguage = "en" | "ja";

// Locale data type
interface LocaleData {
  errors: {
    geminiNotFound: string;
    installGemini: string;
    unsupportedFileType: string;
    images: string;
    text: string;
    documents: string;
  };
  tools: {
    googleSearch: {
      description: string;
      params: {
        query: string;
        limit: string;
        raw: string;
        sandbox: string;
        yolo: string;
        model: string;
      };
    };
    chat: {
      description: string;
      params: {
        prompt: string;
        sandbox: string;
        yolo: string;
        model: string;
      };
    };
    analyzeFile: {
      description: string;
      params: {
        filePath: string;
        prompt: string;
        sandbox: string;
        yolo: string;
        model: string;
      };
    };
  };
}

// Cache for loaded locales
const localeCache: Map<SupportedLanguage, LocaleData> = new Map();

/**
 * Detect the current language from environment variables.
 * Priority: MCP_LANGUAGE > LANG > default (en)
 */
export function detectLanguage(): SupportedLanguage {
  // Check MCP_LANGUAGE first (explicit override)
  const mcpLang = process.env.MCP_LANGUAGE?.toLowerCase();
  if (mcpLang === "ja" || mcpLang === "japanese") {
    return "ja";
  }
  if (mcpLang === "en" || mcpLang === "english") {
    return "en";
  }

  // Check system LANG variable
  const systemLang = process.env.LANG?.toLowerCase() || "";
  if (systemLang.startsWith("ja")) {
    return "ja";
  }

  // Default to English
  return "en";
}

/**
 * Load locale data for a specific language.
 */
function loadLocale(lang: SupportedLanguage): LocaleData {
  // Check cache first
  const cached = localeCache.get(lang);
  if (cached) {
    return cached;
  }

  // Load from file
  const localePath = join(__dirname, "locales", `${lang}.json`);
  try {
    const content = readFileSync(localePath, "utf-8");
    const data = JSON.parse(content) as LocaleData;
    localeCache.set(lang, data);
    return data;
  } catch {
    // Fallback to English if the requested locale is not found
    if (lang !== "en") {
      console.warn(`Locale '${lang}' not found, falling back to English.`);
      return loadLocale("en");
    }
    throw new Error(`Failed to load English locale from ${localePath}`);
  }
}

/**
 * Get the locale data for the current language.
 */
export function getLocale(): LocaleData {
  const lang = detectLanguage();
  return loadLocale(lang);
}

/**
 * Get a translated string with variable substitution.
 * Variables are specified as {variableName} in the translation string.
 */
export function t(key: string, variables?: Record<string, string>): string {
  const locale = getLocale();

  // Navigate to the key (e.g., "errors.geminiNotFound")
  const keys = key.split(".");
  // biome-ignore lint/suspicious/noExplicitAny: Dynamic key access requires any
  let value: any = locale;

  for (const k of keys) {
    value = value?.[k];
    if (value === undefined) {
      console.warn(`Translation key not found: ${key}`);
      return key;
    }
  }

  if (typeof value !== "string") {
    console.warn(`Translation key is not a string: ${key}`);
    return key;
  }

  // Substitute variables
  if (variables) {
    for (const [varName, varValue] of Object.entries(variables)) {
      value = value.replace(new RegExp(`\\{${varName}\\}`, "g"), varValue);
    }
  }

  return value;
}

// Export convenience functions for common translations
export const i18n = {
  detectLanguage,
  getLocale,
  t,
};
