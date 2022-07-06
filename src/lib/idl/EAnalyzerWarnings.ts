export enum EAnalyzerWarnings {
    UnsupportedRenderStateTypeUsed = 3000,
    IncompleteTechnique,
    IncompletePass,
    UselessPassState,
    EmptySemicolon,
    InvalidCbufferRegister,

    ImplicitTypeConversion,
    ImplicitTypeTruncation,

    // part fx
    SortingCannotBeApplied
}