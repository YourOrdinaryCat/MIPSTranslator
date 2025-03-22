import { Injectable } from '@angular/core';
import {
  ArithmeticFunctionCode,
  FunctionCode,
  JumpFunctionCode,
  MoveFromFunctionCode,
  MoveToFunctionCode,
  MultiplicationFunctionCode,
  ShiftFunctionCode,
  ShiftVFunctionCode,
} from '../../lib/mips/funct';
import {
  DecodedInstruction,
  encodeInstruction,
  ImmediateInstruction,
  isJump,
  isReg,
  JumpInstruction,
  RegisterInstruction,
} from '../../lib/mips/instruction';
import {
  ImmediateArithmeticOpcode,
  ImmediateBranchOpcode,
  ImmediateBranchZOpcode,
  ImmediateInstructionOpcode,
  ImmediateLoadOpcode,
  JumpInstructionOpcode,
  KnownInstructionOpcode
} from '../../lib/mips/op';
import { parsePartialInstruction } from '../../lib/mips/parse';
import { Register } from '../../lib/mips/reg';
import { inEnum } from '../../lib/util/enum';

@Injectable({
  providedIn: 'root',
})
export class TranslatorService {
  getFunctCode(name: string): string {
    if (inEnum(name, FunctionCode)) {
      return FunctionCode[name].toString(2).padStart(6, '0');
    }
    return 'unknown';
  }

  convertFunctToName(functBinary: string): string {
    const num = parseInt(functBinary, 2);
    if (inEnum(num, FunctionCode)) {
      return FunctionCode[num];
    } else if (inEnum(num, KnownInstructionOpcode)) {
      return KnownInstructionOpcode[num];
    }

    return 'unknown';
  }

  translateInstructionToHex(instruction: string): string {
    const parsed = parsePartialInstruction(instruction);
    const hex = encodeInstruction(parsed as DecodedInstruction);

    return hex.toString(16).toUpperCase().padStart(8, '0');
  }

  private makeRDisplay(
    inst: RegisterInstruction,
    ...regs: Exclude<keyof RegisterInstruction, 'op' | 'funct'>[]
  ) {
    const vals = [FunctionCode[inst.funct]];
    for (const key of regs) {
      vals.push(
        key === 'shamt'
          ? `0x${inst.shamt.toString(16).padStart(2, '0').toUpperCase()}`
          : `$${Register[inst[key]]}`
      );
    }
    return vals.join(' ');
  }

  private makeIDisplay(
    inst: ImmediateInstruction,
    ...regs: Exclude<keyof ImmediateInstruction, 'op'>[]
  ) {
    const vals = [ImmediateInstructionOpcode[inst.op]];
    for (const key of regs) {
      vals.push(
        key === 'imm'
          ? `0x${inst.imm.toString(16).padStart(4, '0').toUpperCase()}`
          : `$${Register[inst[key]]}`
      );
    }
    return vals.join(' ');
  }

  private makeJDisplay(inst: JumpInstruction) {
    return `${JumpInstructionOpcode[inst.op]} 0x${inst.imm
      .toString(16)
      .padStart(7, '0')
      .toUpperCase()}`;
  }

  translateInstructionToMIPS(hexInstruction: string): string {
    if (hexInstruction.startsWith('0x')) {
      hexInstruction = hexInstruction.slice(2);
    }
    const inst = parsePartialInstruction(hexInstruction) as DecodedInstruction;

    if (isReg(inst)) {
      if (inEnum(inst.funct, ArithmeticFunctionCode)) {
        return this.makeRDisplay(inst, 'rd', 'rs', 'rt');
      }

      if (inEnum(inst.funct, MultiplicationFunctionCode)) {
        return this.makeRDisplay(inst, 'rs', 'rt');
      }

      if (inEnum(inst.funct, ShiftFunctionCode)) {
        return this.makeRDisplay(inst, 'rd', 'rt', 'shamt');
      }

      if (inEnum(inst.funct, ShiftVFunctionCode)) {
        return this.makeRDisplay(inst, 'rd', 'rt', 'rs');
      }

      if (inEnum(inst.funct, MoveToFunctionCode)) {
        return this.makeRDisplay(inst, 'rs');
      }

      if (inEnum(inst.funct, MoveFromFunctionCode)) {
        return this.makeRDisplay(inst, 'rd');
      }

      if (inst.funct === JumpFunctionCode.jalr) {
        return this.makeRDisplay(inst, 'rd', 'rs');
      }
      return this.makeRDisplay(inst, 'rs');
    }

    if (isJump(inst)) {
      return this.makeJDisplay(inst);
    }

    if (inEnum(inst.op, ImmediateArithmeticOpcode)) {
      return this.makeIDisplay(inst, 'rt', 'rs', 'imm');
    }

    if (inEnum(inst.op, ImmediateLoadOpcode)) {
      return this.makeIDisplay(inst, 'rt', 'imm');
    }

    if (inEnum(inst.op, ImmediateBranchOpcode)) {
      return this.makeIDisplay(inst, 'rs', 'rt', 'imm');
    }

    if (inEnum(inst.op, ImmediateBranchZOpcode)) {
      return this.makeIDisplay(inst, 'rs', 'imm');
    }

    // Load store - these use a special format
    return this.makeIDisplay(inst, 'rt', 'imm', 'rs');
  }

  binaryToHex(binaryString: string): string {
    while (binaryString.length % 4 !== 0) {
      binaryString = '0' + binaryString;
    }
    let hexString = '';
    for (let i = 0; i < binaryString.length; i += 4) {
      const binaryChunk = binaryString.substring(i, i + 4);
      const hexDigit = parseInt(binaryChunk, 2).toString(16);
      hexString += hexDigit;
    }
    return '0x' + hexString.toUpperCase();
  }

  hexToBinary(hex: string): string {
    let binary = '';
    for (let i = 0; i < hex.length; i++) {
      let bin = parseInt(hex[i], 16).toString(2);
      binary += bin.padStart(4, '0');
    }
    return binary;
  }

  translateHextoMIPS(textInput: string): string {
    const instructions: string[] = textInput.trim().split('\n');
    const translatedInstructions: string[] = instructions.map((instruction) => {
      return this.translateInstructionToMIPS(instruction.trim());
    });
    const formattedInstructions: string = translatedInstructions.join('\n');
    return formattedInstructions;
  }

  translateMIPStoHex(textInput: string): string {
    const instructions: string[] = textInput.trim().split('\n');
    const translatedInstructions: string[] = instructions.map((instruction) => {
      return this.translateInstructionToHex(instruction.trim());
    });
    const formattedInstructions: string = translatedInstructions.join('\n');
    return formattedInstructions;
  }
}
