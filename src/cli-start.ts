import { setHooksFromConfig } from '.';

const COLORS = {
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  console_color: '\x1b[0m',
} as const;

const colorConsoleText = (text: string, color: keyof typeof COLORS) => {
  const coloredText = `${COLORS[color]}${text}${COLORS.console_color}`;
  return console.log(coloredText);
};

export async function startCli(cwd = process.cwd(), argv = process.argv) {
  try {

    setHooksFromConfig(cwd, argv);

  } catch (error: any) {
    colorConsoleText(
      '[ERROR], Was not able to set git hooks. Error: ' + error,
      'red'
    );
  }
}
