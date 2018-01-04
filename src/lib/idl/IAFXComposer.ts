import { IAFXComponent } from "./IAFXComponent";


export interface IAFXComposer {
	getComponentByName(sComponentName: string): IAFXComponent;

	//API for Effect-resource

	getComponentCountForEffect(pEffectResource: IEffect): number;
	getTotalPassesForEffect(pEffectResource: IEffect): number;
	addComponentToEffect(pEffectResource: IEffect,
		pComponent: IAFXComponent, iShift: number, iPass: number): boolean;
	removeComponentFromEffect(pEffectResource: IEffect,
		pComponent: IAFXComponent, iShift: number, iPass: number): boolean;
	hasComponentForEffect(pEffectResource: IEffect,
		pComponent: IAFXComponent, iShift: number, iPass: number): boolean;

	activateEffectResource(pEffectResource: IEffect, iShift: number): boolean;
	deactivateEffectResource(pEffectResource: IEffect): boolean;

	getPassInputBlendForEffect(pEffectResource: IEffect, iPass: number): IAFXPassInputBlend;
	//API for RenderTechnique
	copyTechniqueOwnComponentBlend(pFrom: IRenderTechnique, pTo: IRenderTechnique): void;

	getMinShiftForOwnTechniqueBlend(pRenderTechnique: IRenderTechnique): number;

	getTotalPassesForTechnique(pRenderTechnique: IRenderTechnique): number;

	addOwnComponentToTechnique(pRenderTechnique: IRenderTechnique,
		pComponent: IAFXComponent, iShift: number, iPass: number): boolean;
	removeOwnComponentToTechnique(pRenderTechnique: IRenderTechnique,
		pComponent: IAFXComponent, iShift: number, iPass: number): boolean;
	hasOwnComponentInTechnique(pRenderTechnique: IRenderTechnique,
		pComponent: IAFXComponent, iShift: number, iPass: number): boolean;

	prepareTechniqueBlend(pRenderTechnique: IRenderTechnique): boolean;

	markTechniqueAsNeedUpdate(pRenderTechnique: IRenderTechnique): void;

	getPassInputBlendForTechnique(pRenderTechnique: IRenderTechnique, iPass: number): IAFXPassInputBlend;

	//API for render

	applyBufferMap(pBufferMap: IBufferMap): boolean;
	applySurfaceMaterial(pSurfaceMaterial: ISurfaceMaterial): boolean;

	_calcRenderID(pSceneObject: ISceneObject, pRenderable: IRenderableObject, bCreateIfNotExists?: boolean): number;

	_getRenderableByRid(iRid: number): IRenderableObject;
	_getObjectByRid(iRid: number): ISceneObject;

	_setCurrentSceneObject(pSceneObject: ISceneObject): void;
	_setCurrentViewport(pViewport: IViewport): void;
	_setCurrentRenderableObject(pRenderable: IRenderableObject): void;

	_getCurrentSceneObject(): ISceneObject;
	_getCurrentViewport(): IViewport;
	_getCurrentRenderableObject(): IRenderableObject;

	_setDefaultCurrentState(): void;

	renderTechniquePass(pRenderTechnique: IRenderTechnique, iPass: number): void;

	//API for load components/AFXEffects

	/** @deprected will be removed from release version, use _loadEffectFromBinary instead.*/
	_loadEffectFromSyntaxTree(pTree: parser.IParseTree, sFileName: string): boolean;
	_loadEffectFromBinary(pData: number8Array, sFileName: string): boolean;
}
