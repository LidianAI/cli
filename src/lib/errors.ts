export class CliError extends Error {
  code: number;

  constructor(message: string, code = 1) {
    super(message);
    this.name = "CliError";
    this.code = code;
  }
}
