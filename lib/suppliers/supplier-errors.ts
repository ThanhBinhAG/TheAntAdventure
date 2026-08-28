export class SupplierRepositoryError extends Error {
  readonly code: 'not_found' | 'validation' | 'conflict';

  constructor(
    message: string,
    code: 'not_found' | 'validation' | 'conflict' = 'validation',
  ) {
    super(message);
    this.name = 'SupplierRepositoryError';
    this.code = code;
  }
}
