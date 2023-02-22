export enum EAnalyzerWarnings {
    UnsupportedRenderStateTypeUsed = 3000,
    IncompleteTechnique,
    IncompletePass,
    UselessPassState,
    EmptySemicolon,
    InvalidCbufferRegister,

    ImplicitTypeConversion,
    ImplicitTypeTruncation,

    Deprecated,

    // part fx
    PartFx_SortingCannotBeApplied,
    PartFx_PresetPropertyHasNotBeenFound,
    PartFx_RenderPassWasNotFound,
    PartFx_EmitterPersistentDataMustBeMarkedAsInout,

    ExternCall
}