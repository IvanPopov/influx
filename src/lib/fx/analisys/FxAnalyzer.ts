import { assert, isBoolean, isNull, isNumber, PropertiesDiff } from "@lib/common";
import { EAnalyzerErrors as EErrors } from '@lib/idl/EAnalyzerErrors';
import { EAnalyzerWarnings as EWarnings } from '@lib/idl/EAnalyzerWarnings';
import { IAnnotationInstruction, ICompileExprInstruction, IDeclInstruction, IIdInstruction, IInstruction, IPassInstruction, ITypeInstruction } from "@lib/idl/IInstruction";
import { IParseNode } from "@lib/idl/parser/IParser";
import { EPartFxPassGeometry, IPartFxInstruction, IPartFxPassInstruction } from "@lib/idl/part/IPartFx";

import { Analyzer, Context, ICompileValidator } from "./Analyzer";
import { IdInstruction } from "./instructions/IdInstruction";
import { PartFxInstruction } from "./instructions/part/PartFxInstruction";
import { PartFxPassInstruction } from "./instructions/part/PartFxPassInstruction";
import { ProgramScope } from "./ProgramScope";
import * as SystemScope from './SystemScope';
import { T_BOOL, T_INT, T_UINT, T_VOID } from "./SystemScope";

type IPartFxPassProperties = PropertiesDiff<IPartFxPassInstruction, IPassInstruction>;
// type is internal property which is always ETechniqueType.k_PartFx for particle fx's,
// so we can omit it.
type IPartFxProperties = Omit<PropertiesDiff<IPartFxInstruction, IDeclInstruction>, "type">;



class FxContext extends Context {
    /** Main particle structure type describing particle's simulation. */
    particleCore: ITypeInstruction;
    /** Particle instance structure type which describe per pass render instance of the particle. */
    particleInstance: ITypeInstruction;

    beginPartFxPass(): void {
        this.beginPass();
        this.particleInstance = null;
    }

    endPartFxPass(): void {
        this.particleInstance = null;
        this.endPass();
    }

    beginPartFx(): void {
        this.particleCore = null;
    }

    endPartFx(): void {
        this.particleCore = null;
    }
}



export class FxAnalyzer extends Analyzer {

    /**
     * AST example:
     *    PassState
     *         T_PUNCTUATOR_59 = ';'
     *       + PassStateExpr 
     *         T_PUNCTUATOR_61 = '='
     *         T_NON_TYPE_ID = 'SpawnRoutine'
     */
    protected analyzePartFXProperty(context: Context, program: ProgramScope, sourceNode: IParseNode): any {
        const children = sourceNode.children;
        console.log(sourceNode);
    }

    /**
     * AST example:
     *    PassDecl
     *       + PassStateBlock 
     *         T_NON_TYPE_ID = 'P0'
     *         T_KW_PASS = 'pass'
     */
    protected analyzePartFXPassDecl(context: FxContext, program: ProgramScope, sourceNode: IParseNode): IPartFxPassInstruction {

        context.beginPartFxPass();

        const children = sourceNode.children;
        const scope = program.currentScope;
        const entry = this.analyzePassStateBlockForShaders(context, program, children[0]);
        const renderStates = this.analyzePassStateBlock(context, program, children[0]);

        // temp solution in order to not highlight useless pass states in the next analysis call.
        context.renderStates = renderStates;

        const fxStates = this.analyzePartFxStateBlock(context, program, children[0]);

        const sorting = isBoolean(fxStates.sorting) ? fxStates.sorting : true;
        const prerenderRoutine = fxStates.prerenderRoutine || null;
        const geometry = fxStates.geometry || EPartFxPassGeometry.k_Billboard;
        const instanceCount = fxStates.instanceCount || 1;

        //
        // Validation of the shader input
        //

        let pixelShader = entry.pixel;

        /**
         * Vertex shader validation pattern:
         *  PixelInputType VertexShader(PartInstance partInstance, Geometry geometry);
         */

        let vertexShader = entry.vertex;
        if (vertexShader) {
            const requiredSemantics = ['POSITION', 'POSITION0'];
            let hasInstance = false;
            let hasRequiredSemantics = false;
            for (const param of vertexShader.def.params) {
                hasInstance = hasInstance ||
                    param.type.subType === context.particleInstance;
                hasRequiredSemantics = hasRequiredSemantics ||
                    !!requiredSemantics.find(semantic => param.type.hasFieldWithSematics(semantic));
            }

            if (!hasInstance) {
                context.error(sourceNode, EErrors.PartFx_VertexShaderParametersMismatch,
                    { tooltip: 'vertex shader must have a valid material param which is compatible with prerender routine.' });
                vertexShader = pixelShader = null;
            }

            // if (!hasRequiredSemantics) {
            //     context.error(sourceNode, EErrors.PartFx_VertexShaderParametersMismatch,
            //         { tooltip: 'doesn\'t have requiredsemantics.' });
            //     vertexShader = pixelShader = null;
            // }
        }


        let id: IIdInstruction = null;
        for (let i = 0; i < children.length; ++i) {
            if (children[i].name === "T_NON_TYPE_ID") {
                let name = children[i].value;
                id = new IdInstruction({ sourceNode: children[i], scope, name });
            }
        }

        const pass = new PartFxPassInstruction({
            scope,
            sourceNode,
            id,

            sorting,
            geometry,
            instanceCount,
            prerenderRoutine,

            renderStates,
            pixelShader,
            vertexShader
        });

        //TODO: add annotation and id

        context.endPartFxPass();

        return pass;
    }


    // TODO: use explicit return type
    protected analyzePartFxStateBlock(context: FxContext, program: ProgramScope, sourceNode: IParseNode): Partial<IPartFxPassProperties> {
        const children = sourceNode.children;
        let states: Partial<IPartFxPassProperties> = {}
        for (let i = children.length - 2; i >= 1; i--) {
            states = { ...states, ...this.analyzePartFXPassProperies(context, program, children[i]) };
        }
        return states;
    }


    /**
    * AST example:
    *    PassState
    *         T_PUNCTUATOR_59 = ';'
    *       + PassStateExpr 
    *         T_PUNCTUATOR_61 = '='
    *         T_NON_TYPE_ID = 'STATE_ONE'
    */
    /**
     * AST example:
     *    PassState
     *         T_PUNCTUATOR_59 = ';'
     *       + PassStateExpr 
     *         T_PUNCTUATOR_61 = '='
     *         T_NON_TYPE_ID = 'STATE_TWO'
     */
    /**
     * AST example:
     *    PassStateExpr
     *         T_PUNCTUATOR_125 = '}'
     *         T_UINT = '1'
     *         T_PUNCTUATOR_44 = ','
     *         T_KW_TRUE = 'true'
     *         T_PUNCTUATOR_123 = '{'
     */
    // TODO: add explicit type for fx statess
    protected analyzePartFXPassProperies(context: FxContext, program: ProgramScope, sourceNode: IParseNode): Partial<IPartFxPassProperties> {

        const children = sourceNode.children;

        const stateName: string = children[children.length - 1].value.toUpperCase();
        const stateExprNode = children[children.length - 3];
        const exprNode = stateExprNode.children[stateExprNode.children.length - 1];

        let fxStates: Partial<IPartFxPassProperties> = {};

        if (isNull(exprNode.value) || isNull(stateName)) {
            console.warn('Pass state is incorrect.'); // TODO: move to warnings
            // TODO: return correct state list
            return fxStates;
        }

        /**
         * AST example:
         *    PassStateExpr
         *         T_PUNCTUATOR_125 = '}'
         *         T_UINT = '1'
         *         T_PUNCTUATOR_44 = ','
         *         T_KW_TRUE = 'true'
         *         T_PUNCTUATOR_123 = '{'
         */
        if (exprNode.value === '{' && stateExprNode.children.length > 3) {
            const values: string[] = new Array(Math.ceil((stateExprNode.children.length - 2) / 2));
            for (let i = stateExprNode.children.length - 2, j = 0; i >= 1; i -= 2, j++) {
                // TODO: validate values with names
                values[j] = stateExprNode.children[i].value.toUpperCase();
            }

            switch (stateName) {
                // case ERenderStates.BLENDFUNC:
                //     if (values.length !== 2) {
                //         console.warn('Pass state are incorrect.');
                //         return {};
                //     }
                //     renderStates[ERenderStates.SRCBLENDCOLOR] = values[0];
                //     renderStates[ERenderStates.SRCBLENDALPHA] = values[0];
                //     renderStates[ERenderStates.DESTBLENDCOLOR] = values[1];
                //     renderStates[ERenderStates.DESTBLENDALPHA] = values[1];
                //     break;
                default:
                    console.warn('Pass fx state is incorrect.');
                    return fxStates;
            }
        }
        /**
         * AST example:
         *    PassStateExpr
         *         T_NON_TYPE_ID = 'FALSE'
         */
        else {
            let value: string = null;
            if (exprNode.value === '{') {
                value = stateExprNode.children[1].value.toUpperCase();
            }
            else {
                value = exprNode.value.toUpperCase();
            }

            switch (stateName) {
                case ('InstanceCount'.toUpperCase()):
                    fxStates.instanceCount = Number(value) || 1;
                    break;
                case ('Geometry'.toUpperCase()):
                    const types = [
                        'Billboard',
                        'Cylinder',
                        'Box',
                        'Sphere',
                        'Line'
                    ].map(type => type.toUpperCase());

                    fxStates.geometry = Math.max(0, types.indexOf(value)) as EPartFxPassGeometry;
                    break;
                case ('Sorting'.toUpperCase()):
                    // TODO: use correct validation with diag error output
                    assert(value == 'TRUE' || value == 'FALSE');
                    fxStates.sorting = (value === 'TRUE');
                    break;
                case ('PrerenderRoutine'.toUpperCase()):
                    {
                        /**
                        * Prerender routine expected as 'void prerender(Part part, out DefaultShaderInput input)'.
                        */
                        let validators: ICompileValidator[] = [
                            /* prerender(Part part, PartInstance instance) */
                            { ret: T_VOID, args: [context.particleCore, null] },
                            /* prerender(Part part, PartInstance instance, int instanceId) */
                            { ret: T_VOID, args: [context.particleCore, null, SystemScope.T_INT] },
                        ];

                        //
                        // TODO: add string-based validators like this:
                        // void prerender(Part part, PartInstance instance, int instanceId?: INSTANCE_ID);
                        //

                        let prerenderRoutine = this.analyzeCompileExpr(context, program, exprNode, validators);

                        if (!prerenderRoutine) {
                            break;
                        }

                        //
                        // check arguments
                        //

                        let fn = prerenderRoutine.function;

                        /** first argument's type */
                        let argv = fn.def.params.map(param => param.type);

                        if (argv.length < 2) {
                            context.error(exprNode, EErrors.InvalidCompileFunctionNotValid,
                                { funcName: fn.name, tooltip: `'PrerenderRoutine' arguments' count mismatch.` });
                            prerenderRoutine = null;
                        }

                        if (!argv[0].readable || /*!argv[0].isEqual(context.particle)*/ argv[0].subType !== context.particleCore ||
                            argv[0].isNotBaseArray() ||
                            !argv[1].hasUsage('out') || !argv[1].writable || argv[1].isNotBaseArray()) {
                            context.error(exprNode, EErrors.InvalidCompileFunctionNotValid,
                                { funcName: fn.name, tooltip: `'PrerenderRoutine' arguments' type mismatch.` });
                            prerenderRoutine = null;
                        }

                        //         argv[1]: "out PartInstance"
                        // argv[1].subType: "PartInstance"
                        context.particleInstance = argv[1].subType;
                        fxStates.prerenderRoutine = prerenderRoutine;
                    }
                    break;
                default:
            }
        }

        return fxStates;
    }


    protected analyzePartFXBody(context: FxContext, program: ProgramScope, sourceNode: IParseNode): IPartFxProperties {
        let passList: IPartFxPassInstruction[] = [];
        let spawnRoutine: ICompileExprInstruction = null;
        let initRoutine: ICompileExprInstruction = null;
        let updateRoutine: ICompileExprInstruction = null;
        let particle: ITypeInstruction = null;
        let capacity: number = null;

        const children = sourceNode.children;

        for (let i = children.length - 2; i > 0; i--) {
            switch (children[i].name) {
                case 'PassState':
                    {
                        let sourceNode = children[i];
                        let stateName = sourceNode.children[3].value; // "T_NON_TYPE_ID"
                        switch (stateName.toUpperCase()) {
                            case ('Capacity'.toUpperCase()):
                                {
                                    // TODO: make correct validation of the capacity value and emit errors
                                    //       through diagnostics system. 
                                    const snum = sourceNode.children[1].children[0].value;
                                    assert(isNumber(Number(snum)));
                                    capacity = Number(snum) || -1;
                                    break;
                                }
                            case ('SpawnRoutine'.toUpperCase()):
                                {
                                    /**
                                     * Spawn routine expected as 'int spawn(void)'.
                                     */
                                    let validator = { ret: T_INT, args: [] };
                                    let objectExrNode = sourceNode.children[1].children[0];
                                    spawnRoutine = this.analyzeCompileExpr(context, program, objectExrNode, [validator]);
                                }
                                break;
                            case ('InitRoutine'.toUpperCase()):
                                {
                                    /** Init routine expected as 'void init(in Part part)'. */
                                    let validators: ICompileValidator[] = [
                                        { ret: T_VOID, args: [null, T_INT] },   /* init(PART part, int partId) */
                                        { ret: T_VOID, args: [null, T_UINT] },  /* init(PART part, int partId) */
                                        { ret: T_VOID, args: [null] },          /* init(PART part) */
                                    ];

                                    // TODO: show error in case of both functions are found
                                    let objectExrNode = sourceNode.children[1].children[0];
                                    initRoutine = this.analyzeCompileExpr(context, program, objectExrNode, validators);

                                    if (!initRoutine) {
                                        break;
                                    }

                                    //
                                    // check arguments
                                    //

                                    let fn = initRoutine.function;
                                    /** first argument's type */
                                    let type = fn.def.params[0].type;

                                    if ((!type.hasUsage('out') && !type.hasUsage('inout')) || type.isNotBaseArray()) {
                                        context.error(objectExrNode, EErrors.InvalidCompileFunctionNotValid,
                                            { funcName: fn.name, tooltip: `'InitRoutine' arguments' type mismatch.` });
                                        initRoutine = null;
                                    }

                                    if (particle && type.subType !== particle) {
                                        context.error(objectExrNode, EErrors.InvalidCompileFunctionNotValid,
                                            { funcName: fn.name, tooltip: `'InitRoutine' arguments' type mismatch.` });
                                        updateRoutine = null;
                                    }

                                    // type is referencing to VariableType of argument,
                                    // while substitute type referencing to declaration. 
                                    particle = type.subType;
                                }
                                break;
                            case ('UpdateRoutine'.toUpperCase()):
                                {
                                    /**
                                     * Update routine expected as 'void update(inout Part part)'.
                                     */
                                    let validators: ICompileValidator[] = [
                                        { ret: T_BOOL, args: [null, T_INT] }, /* update(PART part, int partId) */
                                        { ret: T_BOOL, args: [null] },        /* update(PART part) */
                                    ];

                                    let objectExrNode = sourceNode.children[1].children[0];
                                    updateRoutine = this.analyzeCompileExpr(context, program, objectExrNode, validators);

                                    if (!updateRoutine) {
                                        break;
                                    }

                                    //
                                    // check arguments
                                    //

                                    const fn = updateRoutine.function;
                                    const fdef = fn.def;
                                    const paramList = fdef.params;

                                    if (paramList.length < 1 || paramList.length > 2) {
                                        context.error(objectExrNode, EErrors.InvalidCompileFunctionNotValid,
                                            { funcName: fn.name, tooltip: `'UpdateRoutine' arguments' type mismatch.` });
                                        updateRoutine = null;
                                    }

                                    /** first argument's type */
                                    let type = paramList[0].type;

                                    if (!type.hasUsage('out') && !type.hasUsage('inout') || type.isNotBaseArray()) {
                                        context.error(objectExrNode, EErrors.InvalidCompileFunctionNotValid,
                                            { funcName: fn.name, tooltip: `'UpdateRoutine' arguments' type mismatch.` });
                                        updateRoutine = null;
                                    }

                                    if (particle && type.subType !== particle) {
                                        context.error(objectExrNode, EErrors.InvalidCompileFunctionNotValid,
                                            { funcName: fn.name, tooltip: `'UpdateRoutine' arguments' type mismatch.` });
                                        updateRoutine = null;
                                    }

                                    //
                                    // Check return type
                                    //

                                    if (!fdef.returnType.isEqual(T_BOOL)) {
                                        context.error(objectExrNode, EErrors.InvalidCompileFunctionNotValid,
                                            { funcName: fn.name, tooltip: `'UpdateRoutine' return type mismatch. 'boolean' is expected.` });
                                        updateRoutine = null;
                                    }

                                    if (!updateRoutine) {
                                        break;
                                    }

                                    // type is referencing to VariableType of argument,
                                    // while substitute type referencing to declaration. 
                                    particle = type.subType;
                                }
                                break;
                        }
                    }
                    break;
            }
        }

        // Note: all fx properties should be parsed prior to pass declaraion analysis
        // because some of them are critical for pass validation
        context.particleCore = particle;

        for (let i = children.length - 2; i > 0; i--) {
            switch (children[i].name) {
                case 'PassDecl':
                    {
                        let pass = this.analyzePartFXPassDecl(context, program, children[i]);

                        if (!pass.isValid()) {
                            context.warn((pass.id && pass.id.sourceNode) || children[i], EWarnings.IncompletePass, {
                                techniqueName: pass.name,
                                tooltip: `The pass is not completed. Not all required parameters are specified.`
                            });
                        }

                        assert(!isNull(pass));
                        passList.push(pass);
                    }
                    break;
            }
        }



        return { passList, spawnRoutine, initRoutine, updateRoutine, particle, capacity };
    }

    /**
     * AST example:
     *    PartFxDecl
     *       + PartFxBody 
     *       + Annotation 
     *       + Semantic 
     *       + ComplexNameOpt 
     *         T_KW_FXPART = 'partFx'
     */
    protected analyzePartFXDecl(context: FxContext, program: ProgramScope, sourceNode: IParseNode): IPartFxInstruction {
        const children = sourceNode.children;
        const name = this.analyzeComplexName(children[children.length - 2]);
        // Specifies whether name should be interpreted as globalNamespace.name or just a name;
        const isComplexName = children[children.length - 2].children.length !== 1;
        const scope = program.currentScope;

        let annotation: IAnnotationInstruction = null;
        let semantic: string = null;
        let props: IPartFxProperties = null;

        context.beginPartFx();

        for (let i = children.length - 3; i >= 0; i--) {

            switch (children[i].name) {
                case 'Annotation':
                    annotation = this.analyzeAnnotation(children[i]);
                    break;
                case 'Semantic':
                    semantic = this.analyzeSemantic(children[i]);
                    break;
                case 'PartFxBody':
                    props = this.analyzePartFXBody(context, program, children[i]);
                    break;

            }
        }

        context.endPartFx();

        const partFx = new PartFxInstruction({
            sourceNode, name, semantic, annotation, scope, ...props
        });

        if (!partFx.isValid()) {
            // highlight name only
            context.warn(children[children.length - 2], EWarnings.IncompleteTechnique, {
                techniqueName: partFx.name,
                tooltip: `The technique is not completed. Not all required parameters are specified.`
            });
        }

        FxAnalyzer.addTechnique(context, program, partFx);
        return partFx;
    }


    protected analyzeUnknDecl(context: FxContext, program: ProgramScope, sourceNode: IParseNode): IInstruction[] {
        switch (sourceNode.name) {
            case 'PartFxDecl':
                return [this.analyzePartFXDecl(context, program, sourceNode)];
            default:
                return super.analyzeUnknDecl(context, program, sourceNode);
        }
    }


    protected createContext(uri: string): FxContext {
        return new FxContext(uri);
    }
}
