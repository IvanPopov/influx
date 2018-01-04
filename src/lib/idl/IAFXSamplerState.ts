import { ETextureWrapModes, ETextureFilters } from "./ITexture";


export interface IAFXSamplerState {
	textureName: string;
	// texture: ITexture;

	wrap_s: ETextureWrapModes;
	wrap_t: ETextureWrapModes;

	mag_filter: ETextureFilters;
	min_filter: ETextureFilters;
}


