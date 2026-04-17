const allowedFileNames: string[] = [
  "defaultgame.ini",
  "defaultengine.ini",
  "defaultruntimeoptions.ini",
  "defaultinput.ini",
];

export function checkAllowed(string: string): boolean {
  for (let i = 0; i < allowedFileNames.length; i++) {
    const currentFileName = allowedFileNames[i];
    if (string.toLowerCase() === currentFileName) {
      return true;
    }
  }

  return false;
}
