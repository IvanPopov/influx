import { ExprInstruction } from "./ExprInstruction";
import { IAFXInitExprInstruction, IAFXTypeInstruction, EAFXInstructionTypes, IAFXExprInstruction, IAFXVariableTypeInstruction } from "../../idl/IAFXInstruction";
import { isNull } from "../../common";
import { Instruction } from "./Instruction";
import * as Effect from "../Effect";
import { IParseNode } from "../../idl/parser/IParser";

export class InitExprInstruction extends ExprInstruction implements IAFXInitExprInstruction {
	private _pConstructorType: IAFXTypeInstruction = null;
	private _bIsConst: boolean = null;
	private _isArray: boolean = false;

	constructor(pNode: IParseNode) {
		super(pNode);
		this._eInstructionType = EAFXInstructionTypes.k_InitExprInstruction;
	}

	toCode(): string {
		var sCode: string = "";

		if (!isNull(this._pConstructorType)) {
			sCode += this._pConstructorType.toCode();
		}
		sCode += "(";

		for (var i: number = 0; i < this.instructions.length; i++) {
			sCode += this.instructions[i].toCode();

			if (i !== this.instructions.length - 1) {
				sCode += ",";
			}
		}

		sCode += ")";

		return sCode;
	}

	isConst(): boolean {
		if (isNull(this._bIsConst)) {
			var pInstructionList: IAFXExprInstruction[] = <IAFXExprInstruction[]>this.instructions;

			for (var i: number = 0; i < pInstructionList.length; i++) {
				if (!pInstructionList[i].isConst()) {
					this._bIsConst = false;
					break;
				}
			}

			this._bIsConst = isNull(this._bIsConst) ? true : false;
		}

		return this._bIsConst;
	}

	optimizeForVariableType(pType: IAFXVariableTypeInstruction): boolean {
		if ((pType.isNotBaseArray() && pType.globalScope) ||
			(pType.isArray() && this.instructions.length > 1)) {


			if (pType.length === Instruction.UNDEFINE_LENGTH ||
				(pType.isNotBaseArray() && this.instructions.length !== pType.length) ||
				(!pType.isNotBaseArray() && this.instructions.length !== pType.baseType.length)) {

				return false;
			}

			if (pType.isNotBaseArray()) {
				this._isArray = true;
			}

			var pArrayElementType: IAFXVariableTypeInstruction = pType.arrayElementType;
			var pTestedInstruction: IAFXExprInstruction = null;
			var isOk: boolean = false;

			for (var i: number = 0; i < this.instructions.length; i++) {
				pTestedInstruction = (<IAFXExprInstruction>this.instructions[i]);

				if (pTestedInstruction.instructionType === EAFXInstructionTypes.k_InitExprInstruction) {
					isOk = (<IAFXInitExprInstruction>pTestedInstruction).optimizeForVariableType(pArrayElementType);
					if (!isOk) {
						return false;
					}
				}
				else {
					if (Effect.isSamplerType(pArrayElementType)) {
						if (pTestedInstruction.instructionType !== EAFXInstructionTypes.k_SamplerStateBlockInstruction) {
							return false;
						}
					}
					else {
						isOk = pTestedInstruction.type.isEqual(pArrayElementType);
						if (!isOk) {
							return false;
						}
					}
				}
			}

			this._pConstructorType = pType.baseType;
			return true;
		}
		else {
			var pFirstInstruction: IAFXExprInstruction = <IAFXExprInstruction>this.instructions[0];

			if (this.instructions.length === 1 &&
				pFirstInstruction.instructionType !== EAFXInstructionTypes.k_InitExprInstruction) {

				if (Effect.isSamplerType(pType)) {
					if (pFirstInstruction.instructionType === EAFXInstructionTypes.k_SamplerStateBlockInstruction) {
						return true;
					}
					else {
						return false;
					}
				}

				if (pFirstInstruction.type.isEqual(pType)) {
					return true;
				}
				else {
					return false;
				}
			}
			else if (this.instructions.length === 1) {
				return false;
			}

			var pInstructionList: IAFXInitExprInstruction[] = <IAFXInitExprInstruction[]>this.instructions;
			var pFieldNameList: string[] = pType.getFieldNameList();

			for (var i: number = 0; i < pInstructionList.length; i++) {
				var pFieldType: IAFXVariableTypeInstruction = pType.getFieldType(pFieldNameList[i]);
				if (!pInstructionList[i].optimizeForVariableType(pFieldType)) {
					return false;
				}
			}

			this._pConstructorType = pType.baseType;
			return true;
		}
	}

	evaluate(): boolean {
		if (!this.isConst()) {
			this._pLastEvalResult = null;
			return false;
		}

		var pRes: any = null;

		if (this._isArray) {
			pRes = new Array(this.instructions.length);

			for (var i: number = 0; i < this.instructions.length; i++) {
				var pEvalInstruction = (<IAFXExprInstruction>this.instructions[i]);

				if (pEvalInstruction.evaluate()) {
					pRes[i] = pEvalInstruction.getEvalValue();
				}
			}
		}
		else if (this.instructions.length === 1) {
			var pEvalInstruction = (<IAFXExprInstruction>this.instructions[0]);
			pEvalInstruction.evaluate();
			pRes = pEvalInstruction.getEvalValue();
		}
		else {
			var pJSTypeCtor: any = Effect.getExternalType(this._pConstructorType);
			var pArguments: any[] = new Array(this.instructions.length);

			if (isNull(pJSTypeCtor)) {
				return false;
			}

			try {
				if (Effect.isScalarType(this._pConstructorType)) {
					var pTestedInstruction: IAFXExprInstruction = <IAFXExprInstruction>this.instructions[1];
					if (this.instructions.length > 2 || !pTestedInstruction.evaluate()) {
						return false;
					}

					pRes = pJSTypeCtor(pTestedInstruction.getEvalValue());
				}
				else {
					for (var i: number = 0; i < this.instructions.length; i++) {
						var pTestedInstruction: IAFXExprInstruction = <IAFXExprInstruction>this.instructions[i];

						if (pTestedInstruction.evaluate()) {
							pArguments[i] = pTestedInstruction.getEvalValue();
						}
						else {
							return false;
						}
					}

					pRes = new pJSTypeCtor;
					pRes.set.apply(pRes, pArguments);
				}
			}
			catch (e) {
				return false;
			}
		}

		this._pLastEvalResult = pRes;

		return true;
	}
}
