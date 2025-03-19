import { encodeRawInstruction, type EncodedInstruction } from "./instruction";

/**
 * Parses the provided input into a partial encoded instruction.
 *
 * @param input The input to parse.
 * @returns The encoded instruction. It may be missing certain fields.
 */
export function parsePartialInstruction(input: string): Partial<EncodedInstruction> {
  if (input.startsWith("0x")) {
    input = input.slice(2);
  }

  // If we receive hex input, parse it directly
  if (/^[0-9A-F]{1,8}$/.test(input)) {
    return encodeRawInstruction(parseInt(input, 16));
  }

  // Otherwise, split and parse the input
  return {};
}
