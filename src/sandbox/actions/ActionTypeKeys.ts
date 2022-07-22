export const SOURCE_FILE_REQUEST                    = 'source-file-request';
export const SOURCE_FILE_LOADED                     = 'source-file-loaded';
export const SOURCE_FILE_LOADING_FAILED             = 'source-file-loading-failed';
export const SOURCE_FILE_DROP_STATE                 = 'source-file-drop-state';

export const GRAMMAR_CONTENT_SPECIFIED              = 'grammar-content-specified';
export const PARSER_PARAMS_CHANGED                  = 'parser-params-changed';
export const PARSING_PARAMS_CHANGED                 = 'parsing-params-changed';

export const SOURCE_CODE_MODIFED                    = 'source-code-modified';
export const SOURCE_CODE_PARSING_COMPLETE           = 'source-code-parsing-complete';
export const SOURCE_CODE_ANALYSIS_COMPLETE          = 'source-code-analysis-complete';
export const SOURCE_CODE_ADD_MARKER                 = 'source-code-add-marker';
export const SOURCE_CODE_ADD_MARKER_BATCH           = 'source-code-add-marker-batch';
export const SOURCE_CODE_REMOVE_MARKER              = 'source-code-remove-marker';
export const SOURCE_CODE_REMOVE_MARKER_BATCH        = 'source-code-remove-marker-batch';
export const SOURCE_CODE_ADD_BREAKPOINT             = 'source-code-add-breakpoint';
export const SOURCE_CODE_REMOVE_BREAKPOINT          = 'source-code-remove-breakpoint';

export const SOURCE_CODE_PREPROCESSING_COMPLETE     = 'source-code-preprocessing-complete';

export const DEBUGGER_COMPILE                       = 'debugger-compile';
export const DEBUGGER_START_DEBUG                   = 'debugger-start-debug';
// cancel compilation or jut clean up all previous results from store
export const DEBUGGER_RESET                         = 'debugger-reset';
export const DEBUGGER_COLORIZE                      = 'debugger-colorize';
export const DEBUGGER_OPTIONS_CHANGED               = 'debugger-options-changed';

export const PLAYGROUND_EMITTER_UPDATE              = 'playground-emitter-update';
export const PLAYGROUND_SELECT_EFFECT               = 'playground-select-effect';
export const PLAYGROUND_SWITCH_EMITTER_RUNTIME      = 'playground-force-destroy-and-switch-emitter-runtime-type';
export const PLAYGROUND_SWITCH_VM_RUNTIME           = 'playground-force-destroy-and-switch-vm-runtime';
export const PLAYGROUND_EFFECT_SAVE_REQUEST         = 'playground-effect-save-request';
export const PLAYGROUND_EFFECT_AUTOSAVE_REQUEST     = 'playground-effect-autosave-request';
export const PLAYGROUND_EFFECT_HAS_BEEN_SAVED       = 'playground-effect-has-been-saved';
export const PLAYGROUND_EFFECT_HAS_BEEN_DROPPED     = 'playground-effect-has-been-dropped';
export const PLAYGROUND_SET_OPTION_AUTOSAVE         = 'playground-set-option-autosave';

export const GRAPH_LOADED                           = 'graph-loaded';                   // serialized content of graph has been provided
export const GRAPH_RESET                            = 'graph-reset';                    // nothing 
export const GRAPH_COMPILE                          = 'graph-compile';                  // requst to generate and recompile (via default pipline with source content) code from graph
export const GRAPH_MODIFIED                         = 'graph-modified';                  
export const GRAPH_PART_STRUCTURE_SPECIFIED         = 'graph-part-structure-specified'; // 'Part' strcuture has been modified 
export const GRAPH_NODE_DOCS_PROVIDED               = 'graph-node-docs-provided';       // update floating docs of selected graph node

export const S3D_INIT_ENV                           = 's3d-init-env';
export const S3D_INIT_ENV_SUCCESSED                 = 's3d-init-env-successed';
export const S3D_INIT_ENV_FAILED                    = 's3d-init-env-failed';
export const S3D_CONNECT_P4                         = 's3d-connect-p4';
export const S3D_CONNECT_P4_SUCCESSED               = 's3d-connect-p4-successed';

export const DEPOT_UPDATE_REQUEST                   = 'depot-update-request';
export const DEPOT_UPDATE_COMPLETE                  = 'depot-update-complete';
