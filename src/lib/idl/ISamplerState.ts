import { ETextureWrapModes, ETextureFilters } from "./ITexture";


export interface ISamplerState {
	textureName: string;
	
	wrap_s: ETextureWrapModes;
	wrap_t: ETextureWrapModes;

	mag_filter: ETextureFilters;
	min_filter: ETextureFilters;
}


