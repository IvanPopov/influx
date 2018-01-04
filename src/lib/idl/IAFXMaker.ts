
export interface IAFXBaseAttrInfo {
	name: string;
	semantic: string;
}

export interface IAFXMaker {
	// getShaderProgram(): IShaderProgram;
	// getUniformNames(): string[];
	// getAttributeInfo(): IAFXBaseAttrInfo[];

	// _create(sVertex: string, sPixel: string): boolean;

	// isUniformExists(sName: string): boolean;
	// isAttrExists(sName: string): boolean;

	// isArray(sName: string): boolean;
	// getType(sName: string): EAFXShaderVariableType;
	// getLength(sName: string): number;
	// setUniform(iLocation: number, pValue: any): void;

	// _freeUniformCache(): void;

	// _make(pPassInput: IAFXPassInputBlend, pBufferMap: IBufferMap): IShaderInput;
	// _initInput(pPassInput: IAFXPassInputBlend, pBlend: IAFXSamplerBlender,
	// 	pAttrs: IAFXAttributeBlendContainer): boolean;
	// _createDataPool(): IShaderInput;
	// _getShaderInput(): IShaderInput;
	// _releaseShaderInput(pPool: IShaderInput): void;
}

export interface IAFXMakerMap {
	[index: string]: IAFXMaker;
	[index: number]: IAFXMaker;
}

