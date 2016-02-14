'use strict';
import * as fs from 'fs';
import * as utils from './utils';
import * as ajv from 'ajv';
const ajvInstance: ajv.AjvInstance = ajv();

export const schemasPath = utils.generatedPath + '/schemas';

export function readSchemaFile(path: string): string {
  return fs.readFileSync(schemasPath + '/' + path, 'utf8');
}

export function loadValidator(path: string): JSONSchemaValidator {
  return JSONSchemaValidator.fromSchemaString(readSchemaFile(path));
}

export class JSONSchemaValidationError extends Error {
  validationErrors: ValidationError[];

  constructor(validationErrors: ValidationError[]) {
    const message = 'JSON did not validate correctly against the schema.';
    super(message);
    this.name = 'JSONSchemaValidationError';
    this.message = message;
    this.stack = (<any>new Error()).stack;
    this.validationErrors = validationErrors;
  }
}

export interface ValidationError extends ajv.ErrorObject {}

export class JSONSchemaValidator {
  static fromSchemaString(schemaString: string): JSONSchemaValidator {
    var schemaObject = JSON.parse(schemaString);
    return new JSONSchemaValidator(schemaObject);
  }

  ajvValidationFunction: ajv.ValidationFunction = null;

  constructor(jsonSchemaObject: Object) {
    this.ajvValidationFunction = ajvInstance.compile(jsonSchemaObject);
  }

  validate(jsonObject: any): ValidationError[] {
    if (this.ajvValidationFunction(jsonObject)) {
      return [];
    }

    return this.ajvValidationFunction.errors;
  }

  throwingValidate(jsonObject: any): boolean {
    var errors = this.validate(jsonObject);
    if (errors.length !== 0) {
      throw new JSONSchemaValidationError(errors);

      // Should never be called
      return false;
    }

    return true;
  }
}
