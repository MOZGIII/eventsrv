import * as fs from 'fs';
import * as utils from './utils';

export const schemasPath = utils.generatedPath + '/schemas';

export function readSchemaFile(path: string): string {
  return fs.readFileSync(schemasPath + '/' + path, 'utf8');
}

export function loadValidator(path: string): JSONSchemaValidator {
  return JSONSchemaValidator.fromSchemaString(readSchemaFile(path));
}

export class JSONSchemaValidationError extends Error {
  validationErrors: string[]

  constructor(validationErrors: string[]) {
    const message = 'JSON did not validate correctly against the schema.';
    super(message)
    this.name = 'JSONSchemaValidationError';
    this.message = message;
    this.stack = (<any>new Error()).stack;
    this.validationErrors = validationErrors;
  }
}

export class JSONSchemaValidator {
  static fromSchemaString(schemaString: string): JSONSchemaValidator {
    var schemaObject = JSON.parse(schemaString);
    return new JSONSchemaValidator(schemaObject);
  }

  constructor(jsonSchemaObject: any) {
    // implement validator
  }

  validate(jsonObject: any): string[] {
    return [];
  }

  throwingValidate(jsonObject: any): boolean {
    var errors = this.validate(jsonObject);
    if (errors.length != 0) {
      throw new JSONSchemaValidationError(errors);

      // Should never be called
      return false;
    }

    return true;
  }
}
