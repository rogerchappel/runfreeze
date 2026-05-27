export class RunfreezeError extends Error {
  constructor(
    message: string,
    readonly code = "RUNFREEZE_ERROR",
  ) {
    super(message);
    this.name = "RunfreezeError";
  }
}
