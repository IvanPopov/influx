import { createSLASTDocument } from "@lib/fx/SLASTDocument";
import { createSLDocument, extendSLDocument } from "@lib/fx/SLDocument";
import { createTextDocument } from "@lib/fx/TextDocument";

const readFile = fname => fetch(fname);


export const PART_TYPE = "Part";
export const PART_LOCAL_NAME = "part";

const libraryPath = "./assets/graph/lib.hlsl";
const response = await readFile(libraryPath);
export const LIB_TEXT_DOCUMENT = await createTextDocument(libraryPath, await response.text());
export const LIB_SLAST_DOCUMENT = await createSLASTDocument(LIB_TEXT_DOCUMENT);
export const LIB_SL_DOCUMENT = await createSLDocument(LIB_SLAST_DOCUMENT);

export const PART_STRUCTURE_TEXT_DOCUMENT = await createTextDocument('://part-structure', 
`
struct ${PART_TYPE} {
    float3 speed;
    float3 pos;
    float size;
    float timelife;
};`
);

export const PART_STRUCTURE_SL_DOCUMENT = await extendSLDocument(PART_STRUCTURE_TEXT_DOCUMENT, LIB_SL_DOCUMENT);