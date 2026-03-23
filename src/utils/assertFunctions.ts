import {InvalidArgumentError} from "#commander/index";
import {checkHost, checkPort, checkProtocol, checkString} from "#utils/checkFunctions";
import type {Protocol} from "#types/types";

export function assertObject(value: unknown): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object') {
    throw new InvalidArgumentError('Expected an object')
  }
}

export function assertPort(value: unknown): asserts value is number {
  checkPort(value)
}

export function assertHost(value: unknown): asserts value is string {
  checkHost(value)
}

export function assertProtocol(value: unknown): asserts value is Protocol {
  checkProtocol(value)
}

export function assertString(value: unknown, custom: string = 'Value'): asserts value is string {
  checkString(value, custom)
}
