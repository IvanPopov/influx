
export enum ERenderStates {
	BLENDENABLE,
	CULLFACEENABLE,
	ZENABLE,
	ZWRITEENABLE,
	DITHERENABLE,
	SCISSORTESTENABLE,
	STENCILTESTENABLE,
	POLYGONOFFSETFILLENABLE,

	CULLFACE,
	FRONTFACE,

	SRCBLENDCOLOR,
	DESTBLENDCOLOR,

	SRCBLENDALPHA,
	DESTBLENDALPHA,

	BLENDEQUATIONCOLOR,
	BLENDEQUATIONALPHA,

	ZFUNC,

	ALPHABLENDENABLE,
	ALPHATESTENABLE,

	SRCBLEND, // Fake, set SRCBLENDCOLOR, SRCBLENDALPHA. Not use in setRenderState
	DESTBLEND, // Fake, set DESTBLENDCOLOR, DESTBLENDALPHA. Not use in setRenderState

	BLENDFUNC, // Fake, set SRCBLENDCOLOR, DESTBLENDCOLOR, SRCBLENDALPHA, DESTBLENDALPHA. Not use in setRenderState
	BLENDFUNCSEPARATE, // Fake, set SRCBLENDCOLOR, DESTBLENDCOLOR, SRCBLENDALPHA, DESTBLENDALPHA. Not use in setRenderState

	BLENDEQUATION, // Fake, set BLENDEQUATIONCOLOR, BLENDEQUATIONALPHA. Not use in setRenderState
	BLENDEQUATIONSEPARATE, // Fake, set BLENDEQUATIONCOLOR, BLENDEQUATIONALPHA. Not use in setRenderState
}
