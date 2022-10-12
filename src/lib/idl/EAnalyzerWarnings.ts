export enum EAnalyzerWarnings {
    UnsupportedRenderStateTypeUsed = 3000,
    IncompleteTechnique,
    IncompletePass,
    UselessPassState,
    EmptySemicolon,
    InvalidCbufferRegister,

    ImplicitTypeConversion,
    ImplicitTypeTruncation,

    InvalidTypeForReading, // relaxed version of error (temp solution)

    // part fx
    SortingCannotBeApplied,
    PresetPropertyHasNotBeenFound
}