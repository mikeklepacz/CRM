export const GOOGLE_FONTS = [
  "Roboto", "Open Sans", "Lato", "Montserrat", "Poppins", "Inter", "Nunito", "Raleway",
  "Ubuntu", "Rubik", "Work Sans", "Noto Sans", "Quicksand", "Karla", "Mulish", "Josefin Sans",
  "Source Sans Pro", "Barlow", "DM Sans", "Manrope", "Outfit", "Plus Jakarta Sans",
  "Public Sans", "Be Vietnam Pro", "Figtree", "Lexend", "Sora", "Space Grotesk",
  "Albert Sans", "Urbanist", "Geologica", "Instrument Sans",
  "Playfair Display", "Merriweather", "Lora", "PT Serif", "Libre Baskerville",
  "Crimson Text", "Cormorant Garamond", "EB Garamond", "Spectral", "Source Serif Pro",
  "Noto Serif", "Bitter", "Vollkorn", "Cardo", "Libre Caslon Text", "DM Serif Display",
  "Fraunces", "Bodoni Moda", "Newsreader", "Literata",
  "Oswald", "Bebas Neue", "Anton", "Archivo Black", "Russo One", "Righteous",
  "Alfa Slab One", "Abril Fatface", "Lobster", "Pacifico", "Permanent Marker",
  "Bangers", "Fredoka One", "Passion One", "Bungee", "Titan One", "Black Ops One",
  "Monoton", "Audiowide", "Orbitron", "Staatliches", "Teko", "Chakra Petch",
  "Dancing Script", "Great Vibes", "Parisienne", "Sacramento", "Satisfy", "Allura",
  "Cookie", "Kaushan Script", "Alex Brush", "Tangerine", "Mr Dafoe", "Pinyon Script",
  "Yellowtail", "Courgette", "Caveat", "Indie Flower", "Shadows Into Light",
  "Roboto Mono", "Source Code Pro", "Fira Code", "JetBrains Mono", "IBM Plex Mono",
  "Space Mono", "Inconsolata", "Ubuntu Mono", "Overpass Mono",
  "Arial", "Helvetica", "Times New Roman", "Georgia", "Verdana", "Courier New",
].sort();

const SYSTEM_FONTS = ["Arial", "Helvetica", "Times New Roman", "Georgia", "Verdana", "Courier New"];
const loadedFonts = new Set<string>(SYSTEM_FONTS);
let fontsPreloaded = false;

export function areProductMockupFontsPreloaded(): boolean {
  return fontsPreloaded;
}

export function preloadAllFonts(): Promise<void> {
  if (fontsPreloaded) return Promise.resolve();

  const googleFonts = GOOGLE_FONTS.filter((font) => !SYSTEM_FONTS.includes(font));
  const fontFamilies = googleFonts
    .map((font) => `family=${encodeURIComponent(font.replace(/ /g, "+"))}:wght@400;700`)
    .join("&");

  return new Promise((resolve) => {
    const link = document.createElement("link");
    link.href = `https://fonts.googleapis.com/css2?${fontFamilies}&display=swap`;
    link.rel = "stylesheet";
    link.onload = () => {
      googleFonts.forEach((font) => loadedFonts.add(font));
      fontsPreloaded = true;
      resolve();
    };
    link.onerror = () => {
      fontsPreloaded = true;
      resolve();
    };
    document.head.appendChild(link);
  });
}
