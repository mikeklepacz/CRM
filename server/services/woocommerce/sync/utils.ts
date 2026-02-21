export function columnIndexToLetter(index: number): string {
  let letter = "";
  let i = index + 1;
  while (i > 0) {
    const remainder = (i - 1) % 26;
    letter = String.fromCharCode(65 + remainder) + letter;
    i = Math.floor((i - 1) / 26);
  }
  return letter;
}
